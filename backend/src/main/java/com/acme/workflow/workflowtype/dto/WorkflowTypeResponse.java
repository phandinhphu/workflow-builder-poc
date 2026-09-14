package com.acme.workflow.workflowtype.dto;

import com.acme.workflow.workflowtype.domain.WorkflowTypeAllowedNodeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeEntity;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class WorkflowTypeResponse {
    public String id;
    public String name;
    public String description;
    public boolean isActive;
    public int sortOrder;
    public List<String> allowedNodes;
    public List<ValidationRuleDto> rules;

    public WorkflowTypeResponse() {}

    public WorkflowTypeResponse(String id, String name, String description, boolean isActive, int sortOrder) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.isActive = isActive;
        this.sortOrder = sortOrder;
    }

    public static WorkflowTypeResponse summary(WorkflowTypeEntity entity) {
        if (entity == null) return null;
        return new WorkflowTypeResponse(
                entity.id,
                entity.name,
                entity.description,
                entity.isActive,
                entity.sortOrder
        );
    }

    public static WorkflowTypeResponse detail(WorkflowTypeEntity entity, List<String> allowedNodes, List<ValidationRuleDto> rules) {
        if (entity == null) return null;
        WorkflowTypeResponse res = new WorkflowTypeResponse(
                entity.id,
                entity.name,
                entity.description,
                entity.isActive,
                entity.sortOrder
        );
        res.allowedNodes = allowedNodes;
        res.rules = rules;
        return res;
    }
}
