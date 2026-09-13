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

    @EventListener
    @Transactional
    public void onInstanceCompleted(WorkflowRuntimeEvents.InstanceCompletedEvent event) {
        try {
            resolveTicket(event.instanceId()).ifPresent(ticket -> {
                String outcome = event.status();
                if ("COMPLETED".equalsIgnoreCase(outcome)) {
                    ticket.status = "APPROVED";
                    ticket.currentStepName = "Hoàn tất";
                } else if ("REJECTED".equalsIgnoreCase(outcome) || "FAILED".equalsIgnoreCase(outcome)) {
                    ticket.status = "REJECTED";
                    ticket.currentStepName = "Từ chối";
                } else if ("CANCELLED".equalsIgnoreCase(outcome)) {
                    ticket.status = "CANCELLED";
                    ticket.currentStepName = "Đã hủy";
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
