package com.acme.workflow.runtime.task;

import com.fasterxml.jackson.databind.node.ObjectNode;

public record TaskActionResult(
        boolean success,
        String taskId,
        String status,
        String outcomePort,
        boolean routed,
        ObjectNode finalOutput,
        String actionDesc
) {}
