package com.acme.workflow.form;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormDefinitionEntity;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.dto.*;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class FormService {
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "string", "textarea", "number", "boolean", "date", "datetime", "select", "multiselect", "file"
    );
    private static final Pattern CODE_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{2,64}$");
    private static final Pattern FIELD_KEY_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{1,64}$");

    private final FormDefinitionRepository definitions;
    private final FormVersionRepository versions;
    private final HrmUserRepository users;
    private final Jsons jsons;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;

    public FormService(FormDefinitionRepository definitions, FormVersionRepository versions,
                       HrmUserRepository users, Jsons jsons, CurrentUserService current,
                       PermissionService permissions, AuditService audit) {
        this.definitions = definitions;
        this.versions = versions;
        this.users = users;
        this.jsons = jsons;
        this.current = current;
        this.permissions = permissions;
        this.audit = audit;
    }

    private void requireView(String actor) {
        if (!permissions.has(actor, "FORM_VIEW", null) && !permissions.has(actor, "WORKFLOW_VIEW", null)) {
            throw ApiException.forbidden("Thiếu quyền FORM_VIEW để xem biểu mẫu");
        }
    }

    private void requireEdit(String actor) {
        if (!permissions.has(actor, "FORM_EDIT", null) && !permissions.has(actor, "WORKFLOW_EDIT", null)) {
            throw ApiException.forbidden("Thiếu quyền FORM_EDIT để tạo hoặc chỉnh sửa biểu mẫu");
        }
    }

    private void requirePublish(String actor) {
        if (!permissions.has(actor, "FORM_PUBLISH", null) && !permissions.has(actor, "WORKFLOW_PUBLISH", null)) {
            throw ApiException.forbidden("Thiếu quyền FORM_PUBLISH để xuất bản biểu mẫu");
        }
    }

    @Transactional
    public FormDetailResponse create(CreateFormRequest request) {
        String actor = current.id();
        requireEdit(actor);

        if (request.name == null || request.name.trim().isEmpty()) {
            throw ApiException.badRequest("NAME_REQUIRED", "Tên biểu mẫu không được để trống");
        }
        if (request.code == null || request.code.trim().isEmpty()) {
            throw ApiException.badRequest("CODE_REQUIRED", "Mã biểu mẫu không được để trống");
        }
        String code = request.code.trim().toUpperCase(Locale.ROOT);
        if (!CODE_PATTERN.matcher(code).matches()) {
            throw ApiException.badRequest("INVALID_CODE", "Mã biểu mẫu chỉ được chứa chữ cái, số, gạch dưới và gạch ngang (2-64 ký tự)");
        }
        if (definitions.existsByCode(code)) {
            throw ApiException.badRequest("DUPLICATE_CODE", "Mã biểu mẫu '" + code + "' đã tồn tại trên hệ thống");
        }

        ObjectNode schema = request.draftSchema != null && request.draftSchema.isObject()
                ? (ObjectNode) request.draftSchema
                : jsons.object();
        if (!schema.has("fields") || !schema.get("fields").isArray()) {
            schema.putArray("fields");
        }
        validateSchema(schema, false);

        FormDefinitionEntity entity = new FormDefinitionEntity();
        entity.id = Ids.uuid();
        entity.name = request.name.trim();
        entity.code = code;
        entity.description = request.description != null ? request.description.trim() : null;
        entity.status = "DRAFT";
        entity.draftSchema = jsons.write(schema);
        entity.createdBy = actor;

        definitions.saveAndFlush(entity);

        audit.append(actor, "CREATE", "FORM", entity.id, null, null, Map.of("name", entity.name, "code", entity.code), null);

        return toDetail(entity, schema, null);
    }

    public List<FormSummaryResponse> list(String status, String search) {
        String actor = current.id();
        requireView(actor);

        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        return definitions.findByStatusNotOrderByUpdatedAtDesc("DELETED").stream()
                .filter(f -> status == null || status.isBlank() || status.equalsIgnoreCase(f.status))
                .filter(f -> query.isBlank()
                        || f.name.toLowerCase(Locale.ROOT).contains(query)
                        || f.code.toLowerCase(Locale.ROOT).contains(query))
                .map(this::toSummary)
                .toList();
    }

    public FormDetailResponse get(String id) {
        String actor = current.id();
        requireView(actor);

        FormDefinitionEntity entity = findEntity(id);
        ObjectNode schema = jsons.object(entity.draftSchema);
        Integer latestVer = getLatestVersionNumber(entity.id);

        return toDetail(entity, schema, latestVer);
    }

    @Transactional
    public FormDetailResponse updateDraft(String id, UpdateDraftRequest request) {
        String actor = current.id();
        requireEdit(actor);

        FormDefinitionEntity entity = findEntity(id);

        if (request.name != null && !request.name.trim().isEmpty()) {
            entity.name = request.name.trim();
        }
        if (request.description != null) {
            entity.description = request.description.trim();
        }

        if (request.draftSchema != null) {
            if (!request.draftSchema.isObject()) {
                throw ApiException.badRequest("INVALID_SCHEMA", "Schema biểu mẫu phải là một đối tượng JSON");
            }
            ObjectNode schema = (ObjectNode) request.draftSchema;
            if (!schema.has("fields") || !schema.get("fields").isArray()) {
                schema.putArray("fields");
            }
            validateSchema(schema, false);
            entity.draftSchema = jsons.write(schema);
        }

        definitions.saveAndFlush(entity);

        audit.append(actor, "UPDATE_DRAFT", "FORM", entity.id, null, null, Map.of("name", entity.name), null);

        Integer latestVer = getLatestVersionNumber(entity.id);
        return toDetail(entity, jsons.object(entity.draftSchema), latestVer);
    }

    @Transactional
    public FormVersionResponse publish(String id) {
        String actor = current.id();
        requirePublish(actor);

        FormDefinitionEntity entity = findEntity(id);
        ObjectNode schema = jsons.object(entity.draftSchema);

        // Rigorous validation before freeze
        validateSchema(schema, true);

        String canonicalSnapshot = jsons.write(schema);
        String checksum = Ids.sha256(canonicalSnapshot);

        Optional<FormVersionEntity> latestOpt = versions.findTopByFormDefinitionIdOrderByVersionNumberDesc(id);
        int nextVer = latestOpt.map(v -> v.versionNumber + 1).orElse(1);

        FormVersionEntity version = new FormVersionEntity();
        version.id = Ids.uuid();
        version.formDefinitionId = id;
        version.versionNumber = nextVer;
        version.schemaSnapshot = canonicalSnapshot;
        version.checksum = checksum;
        version.publishedBy = actor;

        versions.saveAndFlush(version);

        entity.status = "PUBLISHED";
        entity.activeVersionId = version.id;
        definitions.saveAndFlush(entity);

        audit.append(actor, "PUBLISH", "FORM", id, null, null,
                Map.of("versionId", version.id, "versionNumber", nextVer, "checksum", checksum), null);

        return toVersionResponse(version);
    }

    public List<FormVersionResponse> getVersions(String formId) {
        String actor = current.id();
        requireView(actor);
        findEntity(formId);

        return versions.findByFormDefinitionIdOrderByVersionNumberDesc(formId).stream()
                .map(this::toVersionResponse)
                .toList();
    }

    public FormVersionResponse getVersion(String formId, String versionId) {
        String actor = current.id();
        requireView(actor);
        findEntity(formId);

        FormVersionEntity version = versions.findById(versionId)
                .filter(v -> v.formDefinitionId.equals(formId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phiên bản " + versionId));

        return toVersionResponse(version);
    }

    @Transactional
    public FormDetailResponse changeStatus(String id, String newStatus) {
        String actor = current.id();
        requireEdit(actor);

        FormDefinitionEntity entity = findEntity(id);
        String status = newStatus.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("DRAFT", "PUBLISHED", "ARCHIVED", "DELETED").contains(status)) {
            throw ApiException.badRequest("INVALID_STATUS", "Trạng thái không hợp lệ: " + newStatus);
        }

        entity.status = status;
        if ("DELETED".equals(status)) {
            entity.deletedAt = Instant.now();
        }
        definitions.saveAndFlush(entity);

        audit.append(actor, "CHANGE_STATUS", "FORM", id, null, null, Map.of("status", status), null);

        Integer latestVer = getLatestVersionNumber(entity.id);
        return toDetail(entity, jsons.object(entity.draftSchema), latestVer);
    }

    // --- Validation and Helper Logic ---

    public void validateSchema(JsonNode schemaNode, boolean isPublishing) {
        if (!schemaNode.has("fields") || !schemaNode.get("fields").isArray()) {
            throw ApiException.badRequest("INVALID_SCHEMA", "Schema biểu mẫu bắt buộc phải có thuộc tính 'fields' dạng danh sách");
        }

        ArrayNode fields = (ArrayNode) schemaNode.get("fields");
        if (isPublishing && fields.isEmpty()) {
            throw ApiException.badRequest("EMPTY_SCHEMA", "Không thể xuất bản biểu mẫu không có trường dữ liệu nào. Vui lòng thêm ít nhất một trường.");
        }

        Set<String> seenKeys = new HashSet<>();

        for (int i = 0; i < fields.size(); i++) {
            JsonNode field = fields.get(i);
            if (!field.isObject()) {
                throw ApiException.badRequest("INVALID_FIELD", "Trường dữ liệu tại vị trí " + (i + 1) + " phải là một đối tượng JSON");
            }

            String key = field.path("key").asText("").trim();
            if (key.isEmpty()) {
                throw ApiException.badRequest("FIELD_KEY_REQUIRED", "Trường dữ liệu tại vị trí " + (i + 1) + " thiếu mã định danh (key)");
            }
            if (!FIELD_KEY_PATTERN.matcher(key).matches()) {
                throw ApiException.badRequest("INVALID_FIELD_KEY", "Mã trường '" + key + "' không hợp lệ. Chỉ chấp nhận chữ cái, số và gạch dưới (1-64 ký tự)");
            }
            if (!seenKeys.add(key.toLowerCase(Locale.ROOT))) {
                throw ApiException.badRequest("DUPLICATE_FIELD_KEY", "Mã trường dữ liệu '" + key + "' bị trùng lặp trong biểu mẫu");
            }

            String label = field.path("label").asText("").trim();
            if (label.isEmpty()) {
                throw ApiException.badRequest("FIELD_LABEL_REQUIRED", "Trường '" + key + "' chưa có nhãn hiển thị (label)");
            }

            String type = field.path("type").asText("").trim().toLowerCase(Locale.ROOT);
            if (!SUPPORTED_TYPES.contains(type)) {
                throw ApiException.badRequest("UNSUPPORTED_FIELD_TYPE",
                        "Kiểu dữ liệu '" + type + "' của trường '" + key + "' không được hỗ trợ. Các kiểu hợp lệ: " + SUPPORTED_TYPES);
            }

            if ("select".equals(type) || "multiselect".equals(type)) {
                JsonNode optionsNode = field.path("options");
                if (!optionsNode.isArray() || optionsNode.isEmpty()) {
                    if (isPublishing) {
                        throw ApiException.badRequest("OPTIONS_REQUIRED", "Trường lựa chọn '" + key + "' (" + type + ") phải có ít nhất 1 tùy chọn");
                    }
                } else {
                    for (JsonNode opt : optionsNode) {
                        if (!opt.isObject() || !opt.has("value") || opt.path("value").asText("").isBlank()) {
                            throw ApiException.badRequest("INVALID_OPTION", "Mỗi tùy chọn của trường '" + key + "' phải có giá trị 'value' không rỗng");
                        }
                    }
                }
            }
        }
    }

    private FormDefinitionEntity findEntity(String id) {
        return definitions.findById(id)
                .filter(f -> !"DELETED".equals(f.status))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy biểu mẫu có ID: " + id));
    }

    private Integer getLatestVersionNumber(String formDefinitionId) {
        return versions.findTopByFormDefinitionIdOrderByVersionNumberDesc(formDefinitionId)
                .map(v -> v.versionNumber)
                .orElse(null);
    }

    private FormSummaryResponse toSummary(FormDefinitionEntity entity) {
        FormSummaryResponse res = new FormSummaryResponse();
        res.id = entity.id;
        res.name = entity.name;
        res.code = entity.code;
        res.description = entity.description;
        res.status = entity.status;
        res.latestVersion = getLatestVersionNumber(entity.id);
        res.createdBy = entity.createdBy;
        res.createdByName = users.findById(entity.createdBy).map(u -> u.displayName).orElse(entity.createdBy);
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;

        JsonNode schema = jsons.read(entity.draftSchema);
        res.fieldCount = schema.path("fields").isArray() ? schema.path("fields").size() : 0;

        return res;
    }

    private FormDetailResponse toDetail(FormDefinitionEntity entity, JsonNode schema, Integer latestVersion) {
        FormDetailResponse res = new FormDetailResponse();
        res.id = entity.id;
        res.name = entity.name;
        res.code = entity.code;
        res.description = entity.description;
        res.status = entity.status;
        res.latestVersion = latestVersion;
        res.activeVersionId = entity.activeVersionId;
        res.draftSchema = schema;
        res.createdBy = entity.createdBy;
        res.createdByName = users.findById(entity.createdBy).map(u -> u.displayName).orElse(entity.createdBy);
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        return res;
    }

    private FormVersionResponse toVersionResponse(FormVersionEntity entity) {
        FormVersionResponse res = new FormVersionResponse();
        res.id = entity.id;
        res.formDefinitionId = entity.formDefinitionId;
        res.versionNumber = entity.versionNumber;
        res.schemaSnapshot = jsons.read(entity.schemaSnapshot);
        res.checksum = entity.checksum;
        res.publishedBy = entity.publishedBy;
        res.publishedByName = users.findById(entity.publishedBy).map(u -> u.displayName).orElse(entity.publishedBy);
        res.publishedAt = entity.publishedAt;
        return res;
    }
}
