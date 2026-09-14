package com.acme.workflow.workflowtype.validator;

import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class RequiredNodeRuleHandler implements WorkflowTypeRuleHandler {
    private static final Set<String> SUPPORTED_RULES = Set.of("REQUIRED_NODE", "MIN_NODE_COUNT");
    private final ObjectMapper objectMapper;

    public RequiredNodeRuleHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean supports(String ruleCode) {
        return ruleCode != null && SUPPORTED_RULES.contains(ruleCode.toUpperCase(Locale.ROOT));
    }

    @Override
    public void evaluate(WorkflowValidationContext context, ValidationRuleDto rule, List<Map<String, Object>> errors) {
        String targetType = rule.targetNodeType;
        if (targetType == null || targetType.isBlank()) {
            return;
        }

        int minCount = 1;
        if (rule.ruleConfig != null && !rule.ruleConfig.isBlank()) {
            try {
                JsonNode config = objectMapper.readTree(rule.ruleConfig);
                if (config.has("min")) {
                    minCount = config.path("min").asInt(1);
                }
            } catch (Exception ignored) {
                // Fallback to default minCount = 1
            }
        }

        long actualCount = context.countNodesByType(targetType);
        if (actualCount < minCount) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("severity", "ERROR");
            item.put("code", rule.ruleCode);
            item.put("message", rule.errorMessage != null && !rule.errorMessage.isBlank()
                    ? rule.errorMessage
                    : "Workflow loại " + context.getWorkflowTypeId() + " yêu cầu tối thiểu " + minCount + " node loại " + targetType);
            item.put("nodeId", null);
            item.put("connectionId", null);
            errors.add(item);
        }
    }
}
