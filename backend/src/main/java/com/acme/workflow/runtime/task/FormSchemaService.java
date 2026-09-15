package com.acme.workflow.runtime.task;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.runtime.RuntimeValueResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
public class FormSchemaService {

    private final Jsons jsons;
    private final RuntimeValueResolver resolver;

    public FormSchemaService(Jsons jsons, RuntimeValueResolver resolver) {
        this.jsons = jsons;
        this.resolver = resolver;
    }

    public ArrayNode resolveEffectiveFormFields(ObjectNode definition, JsonNode node, JsonNode config,
                                                ObjectNode context) {
        ArrayNode result = jsons.mapper().createArrayNode();
        String reviewSourceNodeId = config.path("reviewSourceNodeId").asText(null);
        String nodeType = node.path("type").asText().toUpperCase(Locale.ROOT);
        boolean isReviewNode = "APPROVAL".equals(nodeType) || "REVIEW".equals(nodeType);

        if (isReviewNode && reviewSourceNodeId != null && !reviewSourceNodeId.isBlank() && definition != null) {
            try {
                JsonNode sourceNode = findNode(definition, reviewSourceNodeId);
                if (sourceNode != null) {
                    JsonNode sourceFields = sourceNode.path("config").path("formFields");
                    JsonNode reviewedSub = context.path("reviewedSubmission");
                    if (reviewedSub.isMissingNode() || reviewedSub.isNull()) {
                        reviewedSub = context.path("nodes").path(reviewSourceNodeId);
                    }

                    if (sourceFields.isArray()) {
                        for (JsonNode sf : sourceFields) {
                            ObjectNode copy = sf.deepCopy();
                            copy.put("readOnly", true);
                            copy.put("required", false);
                            String id = copy.path("id").asText();
                            String mapping = copy.path("outputMapping").asText(id);
                            JsonNode val = reviewedSub.has(mapping) ? reviewedSub.get(mapping)
                                    : reviewedSub.has(id) ? reviewedSub.get(id) : null;
                            if (val != null) {
                                copy.set("resolvedValue", val);
                                copy.set("defaultValue", jsons.object().put("kind", "CONSTANT").set("value", val));
                                copy.put("bindingStatus", "RESOLVED");
                            }
                            result.add(copy);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[resolveEffectiveFormFields] Could not load formFields from reviewSourceNodeId={}: {}",
                        reviewSourceNodeId, e.getMessage());
            }
        }

        // Add any explicit formFields configured directly on this node
        JsonNode nodeFields = config.path("formFields");
        if (nodeFields.isArray()) {
            for (JsonNode nf : nodeFields) {
                result.add(nf.deepCopy());
            }
        }
        return result;
    }

    public ArrayNode materializeFields(JsonNode fields, ObjectNode context) {
        ArrayNode result = jsons.mapper().createArrayNode();
        if (fields.isArray())
            fields.forEach(field -> {
                ObjectNode copy = field.deepCopy();
                if (field.has("defaultValue")) {
                    RuntimeValueResolver.Resolution resolution = resolver.resolve(field.path("defaultValue"), context);
                    copy.set("resolvedValue", resolution.value());
                    copy.put("bindingStatus",
                            resolution.resolved() ? "RESOLVED" : resolution.error() == null ? "MISSING" : "ERROR");
                    if (resolution.firstMissingPath() != null)
                        copy.put("bindingPath", resolution.firstMissingPath());
                    if (resolution.error() != null)
                        copy.put("bindingError", resolution.error());
                    else if (!resolution.resolved())
                        copy.put("bindingError", "Không tìm thấy dữ liệu cho ${" + resolution.firstMissingPath() + "}");
                }
                if (field.has("visibleWhen"))
                    copy.put("visible", resolver.evaluate(field.path("visibleWhen").asText(), context));
                if (field.has("optionsSource")) {
                    RuntimeValueResolver.Resolution options = resolver.resolve(field.path("optionsSource"), context);
                    if (options.resolved() && options.value().isArray())
                        copy.set("options", options.value());
                    else if (!options.resolved() && !copy.has("bindingError"))
                        copy.put("bindingError",
                                "Không resolve được nguồn options: ${" + options.firstMissingPath() + "}");
                }
                result.add(copy);
            });
        return result;
    }

    public ArrayNode allowedActions(String type, JsonNode config) {
        ArrayNode result = jsons.mapper().createArrayNode();
        JsonNode configured = config.path("allowedActions");
        if (configured.isArray() && !configured.isEmpty()) {
            configured.forEach(result::add);
            return result;
        }
        result.add("COMPLETE");
        if (Set.of("APPROVAL", "REVIEW", "ASSIGNMENT").contains(type))
            result.add("REJECT");
        return result;
    }

    public ObjectNode normalizeSubmission(ArrayNode fields, JsonNode data) {
        ObjectNode result = jsons.object();
        if (data != null && data.isObject())
            data.fields().forEachRemaining(e -> result.set(e.getKey(), e.getValue()));
        if (fields != null) {
            fields.forEach(field -> {
                String id = field.path("id").asText(), mapping = field.path("outputMapping").asText(id);
                if (result.has(id) && !result.has(mapping))
                    result.set(mapping, result.get(id));
                if (!result.has(mapping) && field.has("resolvedValue"))
                    result.set(mapping, field.get("resolvedValue"));
            });
        }
        return result;
    }

    public void validateSubmission(ArrayNode fields, ObjectNode output) {
        if (fields == null) return;
        List<String> errors = new ArrayList<>();
        fields.forEach(field -> {
            if (field.path("readOnly").asBoolean() || (field.has("visible") && !field.path("visible").asBoolean()))
                return;
            String key = field.path("outputMapping").asText(field.path("id").asText());
            JsonNode value = output.path(key);
            if (field.path("required").asBoolean()
                    && (value.isMissingNode() || value.isNull() || (value.isTextual() && value.asText().isBlank())))
                errors.add(field.path("label").asText(key) + " là bắt buộc");
            if (value.isNumber()) {
                JsonNode validation = field.path("validation");
                if (validation.has("min") && value.decimalValue().compareTo(validation.path("min").decimalValue()) < 0)
                    errors.add(field.path("label").asText(key) + " phải >= " + validation.path("min").asText());
                if (validation.has("max") && value.decimalValue().compareTo(validation.path("max").decimalValue()) > 0)
                    errors.add(field.path("label").asText(key) + " phải <= " + validation.path("max").asText());
            }
        });
        if (!errors.isEmpty())
            throw ApiException.badRequest("FORM_VALIDATION", String.join("; ", errors));
    }

    private JsonNode findNode(ObjectNode definition, String id) {
        for (JsonNode node : definition.path("nodes")) {
            if (id.equals(node.path("id").asText()))
                return node;
        }
        return null;
    }
}
