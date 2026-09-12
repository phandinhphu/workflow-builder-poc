package com.acme.workflow.ticket;

import com.acme.workflow.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Component
public class FormSubmissionValidator {

    public void validate(JsonNode schemaSnapshot, JsonNode formData) {
        if (formData == null || !formData.isObject()) {
            throw ApiException.badRequest("INVALID_FORM_DATA", "Dữ liệu formData phải là một JSON Object");
        }

        JsonNode fieldsNode = schemaSnapshot != null ? schemaSnapshot.path("fields") : null;
        if (fieldsNode == null || !fieldsNode.isArray() || fieldsNode.isEmpty()) {
            return;
        }

        List<Map<String, String>> errors = new ArrayList<>();

        for (JsonNode field : fieldsNode) {
            String key = field.path("key").asText("").trim();
            if (key.isBlank()) continue;

            String label = field.path("label").asText(key);
            String type = field.path("type").asText("string").toLowerCase(Locale.ROOT);
            boolean required = field.path("required").asBoolean(false);
            JsonNode validation = field.path("validation");
            JsonNode val = formData.get(key);

            boolean isMissingOrEmpty = val == null || val.isNull() || (val.isTextual() && val.asText().trim().isEmpty());

            if (required) {
                if (isMissingOrEmpty) {
                    errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' là bắt buộc nhập"));
                    continue;
                }
                if ("multiselect".equals(type) && (!val.isArray() || val.isEmpty())) {
                    errors.add(Map.of("field", key, "label", label, "message", "Vui lòng chọn ít nhất một mục cho '" + label + "'"));
                    continue;
                }
                if ("boolean".equals(type) && !val.asBoolean(false)) {
                    errors.add(Map.of("field", key, "label", label, "message", "Vui lòng xác nhận trường '" + label + "'"));
                    continue;
                }
            }

            if (!isMissingOrEmpty) {
                validateFieldTypeAndConstraints(key, label, type, val, validation, field.path("options"), errors);
            }
        }

        if (!errors.isEmpty()) {
            String firstMsg = errors.get(0).get("message");
            throw ApiException.badRequest("FORM_VALIDATION_FAILED",
                    "Dữ liệu biểu mẫu không hợp lệ (" + errors.size() + " lỗi: " + firstMsg + ")");
        }
    }

    private void validateFieldTypeAndConstraints(String key, String label, String type, JsonNode val,
                                                JsonNode validation, JsonNode optionsNode,
                                                List<Map<String, String>> errors) {
        switch (type) {
            case "number" -> {
                if (!val.isNumber()) {
                    try {
                        new BigDecimal(val.asText().trim());
                    } catch (Exception e) {
                        errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' phải là giá trị số"));
                        return;
                    }
                }
                BigDecimal num = val.isNumber() ? val.decimalValue() : new BigDecimal(val.asText().trim());
                if (validation.has("min") && validation.path("min").isNumber()) {
                    BigDecimal min = validation.path("min").decimalValue();
                    if (num.compareTo(min) < 0) {
                        errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' tối thiểu là " + min));
                    }
                }
                if (validation.has("max") && validation.path("max").isNumber()) {
                    BigDecimal max = validation.path("max").decimalValue();
                    if (num.compareTo(max) > 0) {
                        errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' tối đa là " + max));
                    }
                }
            }
            case "string", "textarea" -> {
                String str = val.asText("");
                if (validation.has("minLength") && validation.path("minLength").isIntegralNumber()) {
                    int minLen = validation.path("minLength").asInt();
                    if (str.length() < minLen) {
                        errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' tối thiểu " + minLen + " ký tự"));
                    }
                }
                if (validation.has("maxLength") && validation.path("maxLength").isIntegralNumber()) {
                    int maxLen = validation.path("maxLength").asInt();
                    if (str.length() > maxLen) {
                        errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' tối đa " + maxLen + " ký tự"));
                    }
                }
                if (validation.has("pattern") && !validation.path("pattern").asText("").isBlank()) {
                    String patternStr = validation.path("pattern").asText("");
                    try {
                        Pattern pattern = Pattern.compile(patternStr);
                        if (!pattern.matcher(str).matches()) {
                            errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' không đúng định dạng yêu cầu"));
                        }
                    } catch (PatternSyntaxException ignored) {
                    }
                }
            }
            case "date" -> {
                try {
                    LocalDate.parse(val.asText());
                } catch (DateTimeParseException e) {
                    errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' không đúng định dạng ngày (YYYY-MM-DD)"));
                }
            }
            case "select" -> {
                if (optionsNode.isArray() && !optionsNode.isEmpty()) {
                    String selectedVal = val.asText();
                    boolean matched = false;
                    for (JsonNode opt : optionsNode) {
                        if (opt.path("value").asText().equals(selectedVal)) {
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        errors.add(Map.of("field", key, "label", label, "message", "Giá trị đã chọn cho '" + label + "' không nằm trong danh sách cho phép"));
                    }
                }
            }
            case "multiselect" -> {
                if (!val.isArray()) {
                    errors.add(Map.of("field", key, "label", label, "message", "Trường '" + label + "' phải là danh sách lựa chọn"));
                }
            }
        }
    }
}
