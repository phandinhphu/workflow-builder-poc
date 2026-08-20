package com.acme.workflow.integration;

import com.acme.workflow.auth.*;
import com.acme.workflow.common.*;
import com.acme.workflow.integration.domain.*;
import com.acme.workflow.integration.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.time.Instant;
import java.util.*;

@Service
public class IntegrationService {
    private final ConnectorRepository connectors;
    private final CredentialReferenceRepository credentials;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;
    private final Jsons jsons;
    private final RestClient.Builder restClient;
    private final boolean allowInsecureHttp;

    public IntegrationService(ConnectorRepository connectors, CredentialReferenceRepository credentials,
                              CurrentUserService current, PermissionService permissions, AuditService audit,
                              Jsons jsons, RestClient.Builder restClient,
                              @Value("${app.integrations.allow-insecure-http:false}") boolean allowInsecureHttp) {
        this.connectors = connectors; this.credentials = credentials; this.current = current;
        this.permissions = permissions; this.audit = audit; this.jsons = jsons;
        this.restClient = restClient; this.allowInsecureHttp = allowInsecureHttp;
    }

    public List<Map<String, Object>> connectors() { return connectors.findAllByOrderByNameAsc().stream().map(this::connectorMap).toList(); }
    public List<Map<String, Object>> credentials() { return credentials.findAllByOrderByNameAsc().stream().map(this::credentialMap).toList(); }

    @Transactional
    public Map<String, Object> saveConnector(String id, ObjectNode body) {
        String actor = current.id(); permissions.require(actor, "CONNECTOR_MANAGE", null);
        ConnectorEntity entity = id == null ? new ConnectorEntity() : connectors.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy connector"));
        Map<String, Object> before = id == null ? null : connectorMap(entity);
        if (id == null) { entity.id = body.path("id").asText(Ids.uuid()); entity.createdBy = actor; entity.createdAt = Instant.now(); }
        entity.connectorKey = required(body, "connectorKey").toUpperCase(Locale.ROOT);
        entity.name = required(body, "name"); entity.connectorType = required(body, "connectorType").toUpperCase(Locale.ROOT);
        entity.baseUrl = nullable(body.path("baseUrl").asText(null)); entity.authType = body.path("authType").asText("NONE").toUpperCase(Locale.ROOT);
        entity.configuration = jsons.write(body.path("configuration").isObject() ? body.path("configuration") : jsons.object());
        entity.enabled = body.path("enabled").asBoolean(true); entity.updatedAt = Instant.now();
        connectors.saveAndFlush(entity);
        Map<String, Object> after = connectorMap(entity); audit.append(actor, id == null ? "CREATE" : "UPDATE", "CONNECTOR", entity.id, null, before, after, null);
        return after;
    }

    @Transactional
    public Map<String, Object> saveCredential(String id, ObjectNode body) {
        String actor = current.id(); permissions.require(actor, "CONNECTOR_MANAGE", body.path("organizationScopeId").asText(null));
        CredentialReferenceEntity entity = id == null ? new CredentialReferenceEntity() : credentials.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy credential reference"));
        Map<String, Object> before = id == null ? null : credentialMap(entity);
        if (id == null) { entity.id = body.path("id").asText(Ids.uuid()); entity.createdBy = actor; entity.createdAt = Instant.now(); }
        entity.name = required(body, "name"); entity.credentialType = required(body, "credentialType").toUpperCase(Locale.ROOT);
        entity.secretReference = required(body, "secretReference");
        if (!entity.secretReference.startsWith("env:")) throw ApiException.badRequest("INVALID_SECRET_REFERENCE", "Production credential chỉ chấp nhận secret reference dạng env:VARIABLE_NAME");
        entity.organizationScopeId = nullable(body.path("organizationScopeId").asText(null));
        entity.metadata = jsons.write(body.path("metadata").isObject() ? body.path("metadata") : jsons.object());
        entity.enabled = body.path("enabled").asBoolean(true); entity.updatedAt = Instant.now(); credentials.saveAndFlush(entity);
        Map<String, Object> after = credentialMap(entity); audit.append(actor, id == null ? "CREATE" : "UPDATE", "CREDENTIAL_REFERENCE", entity.id, entity.organizationScopeId, before, after, null);
        return after;
    }

    public ObjectNode execute(String connectorIdOrKey, String method, String relativePath, ObjectNode headers, JsonNode body, String credentialId, String idempotencyKey) {
        ConnectorEntity connector = connectors.findById(connectorIdOrKey).or(() -> connectors.findByConnectorKey(connectorIdOrKey))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy connector " + connectorIdOrKey));
        if (!connector.enabled) throw ApiException.badRequest("CONNECTOR_DISABLED", "Connector đang bị vô hiệu hóa");
        if (!Set.of("HTTP", "WEBHOOK", "REST").contains(connector.connectorType)) throw ApiException.badRequest("UNSUPPORTED_CONNECTOR", "Runtime chỉ hỗ trợ connector HTTP/REST đã đăng ký");
        URI uri = buildUri(connector.baseUrl, relativePath);
        RestClient.RequestBodySpec request = restClient.build().method(HttpMethod.valueOf(method.toUpperCase(Locale.ROOT))).uri(uri);
        headers.fields().forEachRemaining(entry -> request.header(entry.getKey(), entry.getValue().asText()));
        if (idempotencyKey != null && !idempotencyKey.isBlank()) request.header("Idempotency-Key", idempotencyKey);
        applyCredential(request, credentialId);
        try {
            ResponseEntity<String> response = body == null || body.isNull() || "GET".equalsIgnoreCase(method)
                    ? request.retrieve().toEntity(String.class)
                    : request.contentType(MediaType.APPLICATION_JSON).body(jsons.write(body)).retrieve().toEntity(String.class);
            ObjectNode output = jsons.object(); output.put("statusCode", response.getStatusCode().value());
            String payload = response.getBody();
            if (payload != null && !payload.isBlank()) { try { output.set("body", jsons.read(payload)); } catch (RuntimeException ignored) { output.put("body", payload); } }
            ObjectNode responseHeaders = output.putObject("headers"); response.getHeaders().forEach((key, values) -> responseHeaders.put(key, String.join(",", values)));
            return output;
        } catch (Exception error) {
            throw ApiException.badRequest("CONNECTOR_CALL_FAILED", "Connector call thất bại: " + error.getMessage());
        }
    }

    private void applyCredential(RestClient.RequestBodySpec request, String credentialId) {
        if (credentialId == null || credentialId.isBlank()) return;
        CredentialReferenceEntity credential = credentials.findById(credentialId).orElseThrow(() -> ApiException.notFound("Không tìm thấy credential reference"));
        if (!credential.enabled) throw ApiException.badRequest("CREDENTIAL_DISABLED", "Credential reference đang bị vô hiệu hóa");
        String variable = credential.secretReference.substring("env:".length());
        String secret = System.getenv(variable);
        if (secret == null || secret.isBlank()) throw ApiException.badRequest("SECRET_UNAVAILABLE", "Secret environment chưa được cấu hình: " + variable);
        switch (credential.credentialType) {
            case "BEARER", "OAUTH2" -> request.header(HttpHeaders.AUTHORIZATION, "Bearer " + secret);
            case "API_KEY" -> request.header(jsons.read(credential.metadata).path("headerName").asText("X-API-Key"), secret);
            case "BASIC_AUTH" -> request.header(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder().encodeToString(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            default -> throw ApiException.badRequest("UNSUPPORTED_CREDENTIAL", "Credential type không được hỗ trợ");
        }
    }

    private URI buildUri(String baseUrl, String path) {
        if (baseUrl == null || baseUrl.isBlank()) throw ApiException.badRequest("CONNECTOR_URL_REQUIRED", "Connector thiếu baseUrl");
        URI base = URI.create(baseUrl); String scheme = Optional.ofNullable(base.getScheme()).orElse("").toLowerCase(Locale.ROOT);
        if (!"https".equals(scheme) && !(allowInsecureHttp && "http".equals(scheme))) throw ApiException.badRequest("INSECURE_CONNECTOR_URL", "Connector production bắt buộc dùng HTTPS");
        String normalized = path == null ? "" : path;
        if (normalized.contains("..")) throw ApiException.badRequest("INVALID_CONNECTOR_PATH", "Connector path không hợp lệ");
        return base.resolve(normalized.startsWith("/") ? normalized.substring(1) : normalized);
    }

    private Map<String, Object> connectorMap(ConnectorEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>(); map.put("id", entity.id); map.put("connectorKey", entity.connectorKey); map.put("name", entity.name);
        map.put("connectorType", entity.connectorType); map.put("baseUrl", entity.baseUrl); map.put("authType", entity.authType);
        map.put("configuration", jsons.mapper().convertValue(jsons.read(entity.configuration), Object.class)); map.put("enabled", entity.enabled);
        map.put("lockVersion", entity.lockVersion); map.put("createdBy", entity.createdBy); map.put("createdAt", entity.createdAt); map.put("updatedAt", entity.updatedAt); return map;
    }
    private Map<String, Object> credentialMap(CredentialReferenceEntity entity) {
        Map<String, Object> map = new LinkedHashMap<>(); map.put("id", entity.id); map.put("name", entity.name); map.put("credentialType", entity.credentialType);
        map.put("secretReference", entity.secretReference); map.put("organizationScopeId", entity.organizationScopeId);
        map.put("metadata", jsons.mapper().convertValue(jsons.read(entity.metadata), Object.class)); map.put("enabled", entity.enabled);
        map.put("createdBy", entity.createdBy); map.put("createdAt", entity.createdAt); map.put("updatedAt", entity.updatedAt); return map;
    }
    private String required(JsonNode body, String key) { String value = body.path(key).asText(); if (value.isBlank()) throw ApiException.badRequest("REQUIRED_FIELD", "Thiếu trường " + key); return value; }
    private String nullable(String value) { return value == null || value.isBlank() ? null : value; }
}
