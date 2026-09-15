package com.acme.workflow.workflowtype.validator;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.*;

/**
 * Context chứa thông tin phân tích đồ thị workflow phục vụ việc kiểm tra quy tắc loại workflow.
 */
public class WorkflowValidationContext {
    private final JsonNode definition;
    private final String workflowTypeId;
    private final Map<String, JsonNode> nodesById;
    private final Map<String, String> nodeTypeById;
    private final Map<String, String> nodeNameById;

    public WorkflowValidationContext(JsonNode definition,
                                     String workflowTypeId,
                                     Map<String, JsonNode> nodesById,
                                     Map<String, String> nodeTypeById,
                                     Map<String, String> nodeNameById) {
        this.definition = definition;
        this.workflowTypeId = workflowTypeId;
        this.nodesById = nodesById != null ? nodesById : Collections.emptyMap();
        this.nodeTypeById = nodeTypeById != null ? nodeTypeById : Collections.emptyMap();
        this.nodeNameById = nodeNameById != null ? nodeNameById : Collections.emptyMap();
    }

    public JsonNode getDefinition() {
        return definition;
    }

    public String getWorkflowTypeId() {
        return workflowTypeId;
    }

    public Map<String, JsonNode> getNodesById() {
        return nodesById;
    }

    public Map<String, String> getNodeTypeById() {
        return nodeTypeById;
    }

    public Map<String, String> getNodeNameById() {
        return nodeNameById;
    }

    public long countNodesByType(String nodeType) {
        if (nodeType == null) return 0;
        String upper = nodeType.toUpperCase(Locale.ROOT);
        return nodeTypeById.values().stream()
                .filter(type -> upper.equalsIgnoreCase(type))
                .count();
    }

    public List<Map.Entry<String, String>> findNodesByType(String nodeType) {
        if (nodeType == null) return Collections.emptyList();
        String upper = nodeType.toUpperCase(Locale.ROOT);
        return nodeTypeById.entrySet().stream()
                .filter(e -> upper.equalsIgnoreCase(e.getValue()))
                .toList();
    }

    public String getNodeName(String nodeId) {
        return nodeNameById.getOrDefault(nodeId, nodeId);
    }
}
