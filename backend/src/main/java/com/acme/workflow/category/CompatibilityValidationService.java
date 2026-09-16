package com.acme.workflow.category;

import com.acme.workflow.category.dto.CompatibilityValidationResult;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CompatibilityValidationService {
    private static final Pattern FORM_DATA_TEMPLATE_PATTERN = Pattern.compile("\\$\\{formData\\.([a-zA-Z0-9_]+)}");

    private final FormVersionRepository formVersions;
    private final WorkflowVersionRepository workflowVersions;
    private final Jsons jsons;

    public CompatibilityValidationService(FormVersionRepository formVersions,
            WorkflowVersionRepository workflowVersions,
            Jsons jsons) {
        this.formVersions = formVersions;
        this.workflowVersions = workflowVersions;
        this.jsons = jsons;
    }

    @SuppressWarnings("deprecation")
    public CompatibilityValidationResult validate(String formVersionId, String workflowExecutableId,
            JsonNode fieldMappingNode) {
        if (formVersionId == null || formVersionId.isBlank()) {
            throw ApiException.badRequest("FORM_VERSION_REQUIRED", "formVersionId không được để trống");
        }
        if (workflowExecutableId == null || workflowExecutableId.isBlank()) {
            throw ApiException.badRequest("WORKFLOW_EXECUTABLE_REQUIRED", "workflowExecutableId không được để trống");
        }

        FormVersionEntity formVersion = formVersions.findById(formVersionId)
                .orElseThrow(() -> ApiException.badRequest("FORM_VERSION_NOT_FOUND",
                        "Không tìm thấy FormVersion có id: " + formVersionId));

        WorkflowVersionEntity workflowVersion = workflowVersions.findById(workflowExecutableId)
                .orElseThrow(() -> ApiException.badRequest("WORKFLOW_VERSION_NOT_FOUND",
                        "Không tìm thấy WorkflowVersion có id: " + workflowExecutableId));

        CompatibilityValidationResult result = new CompatibilityValidationResult();

        // 1. Parse Form fields
        Map<String, CompatibilityValidationResult.FormFieldInfo> formFieldsByKey = new LinkedHashMap<>();
        JsonNode formSchema = jsons.read(formVersion.schemaSnapshot);
        if (formSchema.has("fields") && formSchema.get("fields").isArray()) {
            for (JsonNode field : formSchema.get("fields")) {
                String key = field.path("key").asText().trim();
                String label = field.path("label").asText(key);
                String type = field.path("type").asText("string").trim().toLowerCase(Locale.ROOT);
                boolean required = field.path("required").asBoolean(false);
                if (!key.isEmpty()) {
                    CompatibilityValidationResult.FormFieldInfo info = new CompatibilityValidationResult.FormFieldInfo(
                            key, label, type, required);
                    formFieldsByKey.put(key, info);
                    result.formFields.add(info);
                }
            }
        }

        // 2. Parse Field Mapping
        Map<String, String> mapping = new HashMap<>();
        if (fieldMappingNode != null && fieldMappingNode.isObject()) {
            fieldMappingNode.fields().forEachRemaining(entry -> {
                String wfKey = entry.getKey().trim();
                String formKey = entry.getValue().asText("").trim();
                if (!wfKey.isEmpty() && !formKey.isEmpty()) {
                    mapping.put(wfKey, formKey);
                    result.effectiveMapping.put(wfKey, formKey);
                }
            });
        }

        // 3. Extract required fields & template references from Workflow
        JsonNode workflowDef = jsons.read(workflowVersion.definitionSnapshot);
        JsonNode nodes = workflowDef.path("nodes");
        List<CompatibilityValidationResult.WorkflowFieldInfo> requiredFields = new ArrayList<>();
        Set<String> processedFieldKeys = new HashSet<>();

        if (nodes.isArray()) {
            for (JsonNode node : nodes) {
                String nodeId = node.path("id").asText();
                String nodeName = node.hasNonNull("name") && !node.path("name").asText().isBlank()
                        ? node.path("name").asText()
                        : node.path("data").path("label").asText(nodeId);

                // Condition nodes
                JsonNode rulesNode = node.path("data").path("rules");
                if (!rulesNode.isArray() && node.path("config").has("rules")) {
                    rulesNode = node.path("config").path("rules");
                }

                if (rulesNode.isArray()) {
                    for (JsonNode rule : rulesNode) {
                        String field = rule.path("field").asText("").trim();
                        String fieldType = rule.path("fieldType").asText("string").trim().toLowerCase(Locale.ROOT);
                        if (!field.isEmpty()) {
                            CompatibilityValidationResult.WorkflowFieldInfo wfField = new CompatibilityValidationResult.WorkflowFieldInfo(
                                    field, fieldType, nodeId, nodeName);
                            requiredFields.add(wfField);
                            String dedupeKey = field + "::" + fieldType;
                            if (processedFieldKeys.add(dedupeKey)) {
                                result.workflowFields.add(wfField);
                            }
                        }
                    }
                }

                // Check template references ${formData.xxx} across node JSON
                String nodeJsonString = node.toString();
                Matcher matcher = FORM_DATA_TEMPLATE_PATTERN.matcher(nodeJsonString);
                while (matcher.find()) {
                    String refVar = matcher.group(1);
                    String mappedVar = mapping.getOrDefault(refVar, refVar);
                    if (!formFieldsByKey.containsKey(mappedVar)) {
                        result.warnings.add(new CompatibilityValidationResult.ValidationWarning(
                                nodeId,
                                nodeName,
                                "UNRESOLVED_TEMPLATE_VARIABLE",
                                "Node '" + nodeName + "' chứa biến tham chiếu '${formData." + refVar
                                        + "}' nhưng Form không có trường '" + mappedVar + "'."));
                    }
                }
            }
        }

        // 4. Validate Compatibility
        for (CompatibilityValidationResult.WorkflowFieldInfo req : requiredFields) {
            String targetFormField = mapping.getOrDefault(req.field, req.field);
            CompatibilityValidationResult.FormFieldInfo formField = formFieldsByKey.get(targetFormField);

            if (formField == null) {
                result.valid = false;
                result.errors.add(new CompatibilityValidationResult.ValidationError(
                        req.nodeId,
                        req.nodeName,
                        req.field,
                        targetFormField,
                        req.fieldType,
                        null,
                        "MISSING_FIELD",
                        "Node '" + req.nodeName + "' yêu cầu trường '" + req.field + "' (" + req.fieldType
                                + ") nhưng Form không có trường '" + targetFormField + "'."));
            } else if (!isTypeCompatible(req.fieldType, formField.type)) {
                result.valid = false;
                result.errors.add(new CompatibilityValidationResult.ValidationError(
                        req.nodeId,
                        req.nodeName,
                        req.field,
                        targetFormField,
                        req.fieldType,
                        formField.type,
                        "TYPE_MISMATCH",
                        "Node '" + req.nodeName + "' yêu cầu trường '" + req.field + "' kiểu " + req.fieldType
                                + ", nhưng trường '" + targetFormField + "' trong Form lại là kiểu " + formField.type
                                + "."));
            }
        }

        return result;
    }

    public boolean isTypeCompatible(String wfType, String formType) {
        if (wfType == null || formType == null)
            return false;
        String wt = wfType.trim().toLowerCase(Locale.ROOT);
        String ft = formType.trim().toLowerCase(Locale.ROOT);
        if (wt.equals(ft))
            return true;

        return switch (wt) {
            case "string" -> Set.of("string", "textarea", "select").contains(ft);
            case "number" -> Set.of("number").contains(ft);
            case "boolean" -> Set.of("boolean").contains(ft);
            case "date" -> Set.of("date", "datetime").contains(ft);
            case "datetime" -> Set.of("datetime", "date").contains(ft);
            case "select" -> Set.of("select", "string").contains(ft);
            case "multiselect" -> Set.of("multiselect").contains(ft);
            default -> wt.equalsIgnoreCase(ft);
        };
    }
}
