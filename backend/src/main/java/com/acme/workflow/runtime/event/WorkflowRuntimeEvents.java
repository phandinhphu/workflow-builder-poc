package com.acme.workflow.runtime.event;

import java.time.Instant;

public class WorkflowRuntimeEvents {

    public record NodeStartedEvent(
            String instanceId,
            String participantExecutionId,
            String nodeExecutionId,
            String nodeId,
            String nodeName,
            String nodeType
    ) {}

    public record InstanceCompletedEvent(
            String instanceId,
            String status,
            String result,
            Instant completedAt,
            String failureReason
    ) {
        public InstanceCompletedEvent(String instanceId, String status, Instant completedAt) {
            this(instanceId, status, status, completedAt, null);
        }
    }
}
