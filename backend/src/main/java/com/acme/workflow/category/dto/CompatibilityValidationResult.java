package com.acme.workflow.category.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CompatibilityValidationResult {
    public boolean valid = true;
    public List<ValidationError> errors = new ArrayList<>();
    public List<ValidationWarning> warnings = new ArrayList<>();
    public List<WorkflowFieldInfo> workflowFields = new ArrayList<>();
    public List<FormFieldInfo> formFields = new ArrayList<>();
    public Map<String, String> effectiveMapping = new HashMap<>();

    public static class ValidationError {
        public String nodeId;
        public String nodeName;
        public String requiredField;
        public String mappedFormField;
        public String expectedType;
        public String actualType;
        public String errorCode; // MISSING_FIELD, TYPE_MISMATCH
        public String message;

        public ValidationError() {}

        public ValidationError(String nodeId, String nodeName, String requiredField, String mappedFormField,
                               String expectedType, String actualType, String errorCode, String message) {
            this.nodeId = nodeId;
            this.nodeName = nodeName;
            this.requiredField = requiredField;
            this.mappedFormField = mappedFormField;
            this.expectedType = expectedType;
            this.actualType = actualType;
            this.errorCode = errorCode;
            this.message = message;
        }
    }

    public static class ValidationWarning {
        public String nodeId;
        public String nodeName;
        public String warningCode;
        public String message;

        public ValidationWarning() {}

        public ValidationWarning(String nodeId, String nodeName, String warningCode, String message) {
            this.nodeId = nodeId;
            this.nodeName = nodeName;
            this.warningCode = warningCode;
            this.message = message;
        }
    }

    public static class WorkflowFieldInfo {
        public String field;
        public String fieldType;
        public String nodeId;
        public String nodeName;

        public WorkflowFieldInfo() {}

        public WorkflowFieldInfo(String field, String fieldType, String nodeId, String nodeName) {
            this.field = field;
            this.fieldType = fieldType;
            this.nodeId = nodeId;
            this.nodeName = nodeName;
        }
    }

    public static class FormFieldInfo {
        public String key;
        public String label;
        public String type;
        public boolean required;

        public FormFieldInfo() {}

        public FormFieldInfo(String key, String label, String type, boolean required) {
            this.key = key;
            this.label = label;
            this.type = type;
            this.required = required;
        }
    }
}
