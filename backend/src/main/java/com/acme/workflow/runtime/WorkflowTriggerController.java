package com.acme.workflow.runtime;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * WorkflowTriggerController (Simplified - New Architecture)
 *
 * Old endpoints removed:
 * POST /api/v1/triggers/form/{workflowId} - form trigger (removed)
 * POST /api/v1/triggers/webhook/{workflowId} - webhook trigger with HMAC
 * (removed)
 *
 * In the new Decoupled Binding Architecture, all workflow activation flows
 * through:
 * POST /api/v1/tickets -> TicketService ->
 * RuntimeEngineService.startWithExecutable()
 *
 * The event signal endpoint is kept for WAIT_EVENT node wakeup.
 */
@RestController
@RequestMapping("/api/v1/triggers")
public class WorkflowTriggerController {
    private final RuntimeEngineService engine;

    public WorkflowTriggerController(RuntimeEngineService engine) {
        this.engine = engine;
    }

    /**
     * Signal an event to resume a WAIT_EVENT node.
     * This is kept as it is a workflow-internal mechanism unrelated to trigger
     * types.
     */
    @PostMapping("/events/{eventName}/{correlationKey}")
    Map<String, Object> event(@PathVariable String eventName,
            @PathVariable String correlationKey,
            @RequestBody(required = false) ObjectNode payload) {
        return engine.signal(eventName, correlationKey,
                payload == null ? new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode() : payload);
    }

    // -----------------------------------------------------------------------
    // REMOVED in new architecture:
    //
    // POST /api/v1/triggers/form/{workflowId}
    // - Form trigger type removed. Form is bound at Ticket Category level.
    //
    // POST /api/v1/triggers/webhook/{workflowId}
    // - Webhook trigger with HMAC-SHA256 verification removed.
    // - Workflow definitions no longer carry secretReference.
    // -----------------------------------------------------------------------
}
