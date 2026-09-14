package com.acme.workflow.workflowtype.dto;

import com.acme.workflow.workflowtype.domain.WorkflowTypeValidationRuleEntity;

public class ValidationRuleDto {
    public String id;
    public String workflowTypeId;
    public String ruleCode;
    public String targetNodeType;
    public String errorMessage;
    public String ruleConfig;

    public ValidationRuleDto() {}

    public ValidationRuleDto(String id, String workflowTypeId, String ruleCode, String targetNodeType, String errorMessage, String ruleConfig) {
        this.id = id;
        this.workflowTypeId = workflowTypeId;
        this.ruleCode = ruleCode;
        this.targetNodeType = targetNodeType;
        this.errorMessage = errorMessage;
        this.ruleConfig = ruleConfig;
    }

    public static ValidationRuleDto from(WorkflowTypeValidationRuleEntity entity) {
        if (entity == null) return null;
        return new ValidationRuleDto(
                entity.id,
                entity.workflowTypeId,
                entity.ruleCode,
                entity.targetNodeType,
                entity.errorMessage,
                entity.ruleConfig
        );
    }
}
