package com.acme.workflow.runtime.executor;

import com.acme.workflow.runtime.RuntimeEngineService;
import com.acme.workflow.runtime.domain.NodeExecutionEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

public record NodeExecutionContext(
        String instanceId,
        String peId,
        NodeExecutionEntity execution,
        JsonNode node,
        ObjectNode definition,
        ObjectNode context,
        int depth,
        RuntimeEngineService engine) {
}
