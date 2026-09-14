package com.acme.workflow.workflowtype.validator;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AllowedNodeSetHandler {

    public void evaluate(WorkflowValidationContext context, Set<String> allowedNodeTypes, List<Map<String, Object>> errors) {
        if (allowedNodeTypes == null || allowedNodeTypes.isEmpty()) {
            return;
        }

        Set<String> normalizedAllowed = new HashSet<>();
        for (String nodeType : allowedNodeTypes) {
            if (nodeType != null) {
                normalizedAllowed.add(nodeType.trim().toUpperCase(Locale.ROOT));
            }
        }

        for (Map.Entry<String, String> entry : context.getNodeTypeById().entrySet()) {
            String nodeId = entry.getKey();
            String nodeType = entry.getValue();
            String normalizedType = nodeType != null ? nodeType.trim().toUpperCase(Locale.ROOT) : "";

            if (!normalizedAllowed.contains(normalizedType)) {
                String nodeName = context.getNodeName(nodeId);
                String message = "Node loại " + nodeType + " không được phép sử dụng trong loại workflow "
                        + context.getWorkflowTypeId() + " (Node: '" + nodeName + "' [" + nodeId + "])";

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("severity", "ERROR");
                item.put("code", "NODE_TYPE_NOT_ALLOWED");
                item.put("message", message);
                item.put("nodeId", nodeId);
                item.put("connectionId", null);
                errors.add(item);
            }
        }
    }
}
