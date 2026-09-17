package com.acme.workflow.ticket;

import com.acme.workflow.runtime.event.WorkflowRuntimeEvents;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.ticket.domain.TicketEntity;
import com.acme.workflow.ticket.repository.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Component
public class TicketWorkflowEventListener {

    private static final Set<String> NON_USER_STEPS = Set.of("START", "CONDITION");

    private final TicketRepository ticketRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;

    public TicketWorkflowEventListener(TicketRepository ticketRepository,
                                       WorkflowInstanceRepository workflowInstanceRepository) {
        this.ticketRepository = ticketRepository;
        this.workflowInstanceRepository = workflowInstanceRepository;
    }

    private Optional<TicketEntity> resolveTicket(String instanceId) {
        Optional<TicketEntity> opt = ticketRepository.findByWorkflowInstanceId(instanceId);
        if (opt.isPresent()) {
            return opt;
        }
        if (workflowInstanceRepository != null) {
            return workflowInstanceRepository.findById(instanceId)
                    .flatMap(inst -> (inst.requestCode != null && !inst.requestCode.isBlank())
                            ? ticketRepository.findByTicketCode(inst.requestCode)
                            : Optional.empty())
                    .map(t -> {
                        if (t.workflowInstanceId == null) {
                            t.workflowInstanceId = instanceId;
                            ticketRepository.save(t);
                        }
                        return t;
                    });
        }
        return Optional.empty();
    }

    @EventListener
    @Transactional
    public void onNodeStarted(WorkflowRuntimeEvents.NodeStartedEvent event) {
        try {
            resolveTicket(event.instanceId()).ifPresent(ticket -> {
                String nodeType = event.nodeType() != null ? event.nodeType().toUpperCase() : "";
                String stepName = event.nodeName() != null && !event.nodeName().isBlank()
                        ? event.nodeName() : event.nodeId();

                if (!"START".equals(nodeType)) {
                    ticket.currentStepName = stepName;
                    if ("SUBMITTED".equals(ticket.status) && !NON_USER_STEPS.contains(nodeType)) {
                        ticket.status = "IN_REVIEW";
                    }
                    ticketRepository.save(ticket);
                    log.debug("[TicketWorkflowEventListener] Updated ticket {} step to '{}', status: {}",
                            ticket.ticketCode, stepName, ticket.status);
                }
            });
        } catch (Exception e) {
            log.error("[TicketWorkflowEventListener] Error handling NodeStartedEvent for instance {}",
                    event.instanceId(), e);
        }
    }

    private static final Map<String, TicketStatusMapping> OUTCOME_MAPPING = Map.of(
            "APPROVED", new TicketStatusMapping("APPROVED", "Đã phê duyệt"),
            "AUTO_APPROVED", new TicketStatusMapping("APPROVED", "Tự động phê duyệt"),
            "SUCCESS", new TicketStatusMapping("APPROVED", "Hoàn tất"),
            "REJECTED", new TicketStatusMapping("REJECTED", "Bị từ chối"),
            "PAID", new TicketStatusMapping("PAID", "Đã giải ngân"),
            "DISBURSED", new TicketStatusMapping("PAID", "Đã giải ngân"),
            "COMPLETED", new TicketStatusMapping("COMPLETED", "Hoàn tất"),
            "RESOLVED", new TicketStatusMapping("RESOLVED", "Đã xử lý"),
            "CANCELLED", new TicketStatusMapping("CANCELLED", "Đã hủy")
    );

    record TicketStatusMapping(String ticketStatus, String stepLabel) {}

    private boolean isFinalStatus(String status) {
        return Set.of("APPROVED", "REJECTED", "CANCELLED", "PAID", "COMPLETED", "RESOLVED").contains(status);
    }

    @EventListener
    @Transactional
    public void onInstanceCompleted(WorkflowRuntimeEvents.InstanceCompletedEvent event) {
        try {
            resolveTicket(event.instanceId()).ifPresent(ticket -> {
                if (isFinalStatus(ticket.status)) {
                    log.debug("[TicketWorkflowEventListener] Ticket {} already in final status ({}), skip finalize",
                            ticket.ticketCode, ticket.status);
                    return;
                }

                String status = event.status() != null ? event.status().toUpperCase() : "COMPLETED";
                String result = event.result() != null ? event.result().toUpperCase() : status;

                if ("FAILED".equalsIgnoreCase(status)) {
                    ticket.status = "PROCESSING_ERROR";
                    ticket.currentStepName = "Lỗi xử lý hệ thống";
                    log.warn("[TicketWorkflowEventListener] Instance {} failed with reason: {}",
                            event.instanceId(), event.failureReason());
                } else if ("CANCELLED".equalsIgnoreCase(status)) {
                    ticket.status = "CANCELLED";
                    ticket.currentStepName = "Đã hủy";
                } else {
                    TicketStatusMapping mapping = OUTCOME_MAPPING.get(result);
                    if (mapping != null) {
                        ticket.status = mapping.ticketStatus();
                        ticket.currentStepName = mapping.stepLabel();
                    } else {
                        ticket.status = result;
                        ticket.currentStepName = "Hoàn tất";
                    }
                }
                ticket.resolvedAt = event.completedAt() != null ? event.completedAt() : Instant.now();
                ticketRepository.save(ticket);
                log.info("[TicketWorkflowEventListener] Finalized ticket {} to status: {}, step: {}",
                        ticket.ticketCode, ticket.status, ticket.currentStepName);
            });
        } catch (Exception e) {
            log.error("[TicketWorkflowEventListener] Error handling InstanceCompletedEvent for instance {}",
                    event.instanceId(), e);
        }
    }
}
