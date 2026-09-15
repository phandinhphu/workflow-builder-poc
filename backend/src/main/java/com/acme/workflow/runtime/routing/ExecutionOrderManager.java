package com.acme.workflow.runtime.routing;

import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;

@Service
public class ExecutionOrderManager {

    private final NodeExecutionRepository executions;

    public ExecutionOrderManager(NodeExecutionRepository executions) {
        this.executions = executions;
    }

    public int getIteration(String peId, String nodeId) {
        return (int) executions.countByParticipantExecutionIdAndNodeId(peId, nodeId);
    }

    public int nextExecutionOrder(String instanceId) {
        return (int) executions.countByInstanceId(instanceId) + 1;
    }

    public boolean isMaxIterationsExceeded(int iteration, JsonNode settings) {
        int max = (settings != null && settings.has("maxIterations"))
                ? settings.path("maxIterations").asInt(100) : 100;
        return iteration >= max;
    }
}
