package com.acme.workflow.workflowtype.validator;

import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class ForbiddenNodeRuleHandler implements WorkflowTypeRuleHandler {
    private static final String FORBIDDEN_NODE_RULE = "FORBIDDEN_NODE";

    @Override
    public boolean supports(String ruleCode) {
        return ruleCode != null && FORBIDDEN_NODE_RULE.equalsIgnoreCase(ruleCode.trim());
    }

    @Override
    public void evaluate(WorkflowValidationContext context, ValidationRuleDto rule, List<Map<String, Object>> errors) {
        String targetType = rule.targetNodeType;
        if (targetType == null || targetType.isBlank()) {
            return;
        }

        List<Map.Entry<String, String>> matchingNodes = context.findNodesByType(targetType);
        for (Map.Entry<String, String> entry : matchingNodes) {
            String nodeId = entry.getKey();
            String nodeName = context.getNodeName(nodeId);

            String baseMessage = rule.errorMessage != null && !rule.errorMessage.isBlank()
                    ? rule.errorMessage
                    : "Workflow loại " + context.getWorkflowTypeId() + " không được phép chứa node loại " + targetType;

            String detailedMessage = baseMessage + " (Node: '" + nodeName + "' [" + nodeId + "])";

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("severity", "ERROR");
            item.put("code", rule.ruleCode);
            item.put("message", detailedMessage);
            item.put("nodeId", nodeId);
            item.put("connectionId", null);
            errors.add(item);
        }
    }
}
