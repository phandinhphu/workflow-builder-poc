package com.acme.workflow.workflowtype.validator;

import com.acme.workflow.workflowtype.domain.WorkflowTypeAllowedNodeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeValidationRuleEntity;
import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import com.acme.workflow.workflowtype.repository.WorkflowTypeAllowedNodeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeValidationRuleRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

@Component
public class WorkflowTypeRuleEngine {
    private final WorkflowTypeRepository workflowTypeRepo;
    private final WorkflowTypeAllowedNodeRepository allowedNodeRepo;
    private final WorkflowTypeValidationRuleRepository validationRuleRepo;
    private final List<WorkflowTypeRuleHandler> ruleHandlers;
    private final AllowedNodeSetHandler allowedNodeSetHandler;

    public WorkflowTypeRuleEngine(WorkflowTypeRepository workflowTypeRepo,
                                  WorkflowTypeAllowedNodeRepository allowedNodeRepo,
                                  WorkflowTypeValidationRuleRepository validationRuleRepo,
                                  List<WorkflowTypeRuleHandler> ruleHandlers,
                                  AllowedNodeSetHandler allowedNodeSetHandler) {
        this.workflowTypeRepo = workflowTypeRepo;
        this.allowedNodeRepo = allowedNodeRepo;
        this.validationRuleRepo = validationRuleRepo;
        this.ruleHandlers = ruleHandlers != null ? ruleHandlers : Collections.emptyList();
        this.allowedNodeSetHandler = allowedNodeSetHandler != null ? allowedNodeSetHandler : new AllowedNodeSetHandler();
    }

    public void validate(WorkflowValidationContext context, List<Map<String, Object>> errors, List<Map<String, Object>> warnings) {
        String rawType = context.getWorkflowTypeId();
        if (rawType == null || rawType.isBlank()) {
            error(errors, "WORKFLOW_TYPE_REQUIRED", "Workflow cần có loại workflow (type)", null, null);
            return;
        }

        String type = rawType.trim().toUpperCase(Locale.ROOT);

        // Escape hatch for CUSTOM: Bypass type-specific rules
        if ("CUSTOM".equals(type)) {
            return;
        }

        // Verify type existence
        if (!workflowTypeRepo.existsById(type)) {
            error(errors, "WORKFLOW_TYPE_INVALID", "Loại workflow không hợp lệ hoặc không tồn tại: " + rawType, null, null);
            return;
        }

        // 1. Check allowed nodes
        List<WorkflowTypeAllowedNodeEntity> allowedNodeEntities = allowedNodeRepo.findByWorkflowTypeId(type);
        Set<String> allowedNodeTypes = allowedNodeEntities.stream()
                .map(an -> an.nodeType)
                .collect(Collectors.toSet());
        allowedNodeSetHandler.evaluate(context, allowedNodeTypes, errors);

        // 2. Evaluate specific validation rules
        List<WorkflowTypeValidationRuleEntity> ruleEntities = validationRuleRepo.findByWorkflowTypeId(type);
        for (WorkflowTypeValidationRuleEntity ruleEntity : ruleEntities) {
            ValidationRuleDto ruleDto = ValidationRuleDto.from(ruleEntity);
            for (WorkflowTypeRuleHandler handler : ruleHandlers) {
                if (handler.supports(ruleDto.ruleCode)) {
                    handler.evaluate(context, ruleDto, errors);
                }
            }
        }
    }

    private void error(List<Map<String, Object>> list, String code, String message, String nodeId, String connectionId) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("severity", "ERROR");
        item.put("code", code);
        item.put("message", message);
        if (nodeId != null) item.put("nodeId", nodeId);
        if (connectionId != null) item.put("connectionId", connectionId);
        list.add(item);
    }
}
