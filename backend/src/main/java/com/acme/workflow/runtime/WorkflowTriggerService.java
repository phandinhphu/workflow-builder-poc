package com.acme.workflow.runtime;

import com.acme.workflow.common.*;
import com.acme.workflow.workflow.repository.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * WorkflowTriggerService (Simplified - New Architecture)
 *
 * In the new Decoupled Binding Architecture (Form – Workflow – Ticket Category):
 * - All workflow activation flows through: User submits Ticket -> TicketService -> startWithExecutable()
 * - The old trigger types (manual, form, webhook, schedule) and their enforcement logic
 *   have been removed as they violate the Decoupling Principle.
 * - Background Cron Scheduler has been removed: no workflow should self-activate via schedule
 *   within the Ticket Platform model.
 *
 * This service is kept as a thin facade for direct API invocations (e.g., testing or admin tools).
 */
@Service
public class WorkflowTriggerService {
    private final WorkflowDefinitionRepository workflows;
    private final WorkflowVersionRepository versions;
    private final RuntimeEngineService engine;
    private final Jsons jsons;

    public WorkflowTriggerService(WorkflowDefinitionRepository workflows, WorkflowVersionRepository versions,
                                  RuntimeEngineService engine, Jsons jsons) {
        this.workflows = workflows;
        this.versions = versions;
        this.engine = engine;
        this.jsons = jsons;
    }

    /**
     * Start a workflow instance directly (for admin/testing purposes).
     * No trigger-type enforcement. The workflow must be PUBLISHED.
     */
    public Map<String, Object> start(String workflowId, ObjectNode request) {
        ensurePublished(workflowId);
        return engine.start(workflowId, request);
    }

    private void ensurePublished(String workflowId) {
        var workflow = workflows.findById(workflowId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy workflow"));
        if (!"PUBLISHED".equals(workflow.status) || workflow.activeVersionId == null)
            throw ApiException.badRequest("WORKFLOW_NOT_PUBLISHED", "Workflow chưa publish");
    }

    // -----------------------------------------------------------------------
    // REMOVED in new architecture:
    //
    // manual()  - replaced by TicketService.submitTicket() -> startWithExecutable()
    // form()    - form trigger type no longer exists; Form is bound at Ticket Category level
    // webhook() - webhook trigger type removed; no HMAC verification in workflow definition
    //
    // @Scheduled scheduled() - Background cron scheduler removed.
    //   In the new Ticket Platform model, all workflow instances are initiated by user actions
    //   (Submit Ticket). No workflow self-activates via cron.
    // -----------------------------------------------------------------------
}
