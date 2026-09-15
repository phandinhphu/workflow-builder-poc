package com.acme.workflow.runtime.event;

import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.runtime.domain.RuntimeEventEntity;
import com.acme.workflow.runtime.repository.RuntimeEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
public class RuntimeEventLogger {
    private final RuntimeEventRepository events;
    private final ApplicationEventPublisher eventPublisher;
    private final Jsons jsons;

    public RuntimeEventLogger(RuntimeEventRepository events,
                              ApplicationEventPublisher eventPublisher,
                              Jsons jsons) {
        this.events = events;
        this.eventPublisher = eventPublisher;
        this.jsons = jsons;
    }

    public void logEvent(String instanceId, String peId, String executionId, String type, String title,
                         String description, String status, String actor, Object data) {
        log.info("Title: {}", title);
        log.info("Event: {}", data);

        RuntimeEventEntity event = new RuntimeEventEntity();
        event.id = Ids.uuid();
        event.instanceId = instanceId;
        event.participantExecutionId = peId;
        event.nodeExecutionId = executionId;
        event.eventType = type;
        event.title = title;
        event.description = description;
        event.eventStatus = status;
        event.actorId = actor;
        event.eventData = jsons.write(data == null ? Map.of() : data);
        event.createdAt = Instant.now();
        events.save(event);
    }

    public void publishNodeStarted(String instanceId, String peId, String executionId, String nodeId, String nodeName, String nodeType) {
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new WorkflowRuntimeEvents.NodeStartedEvent(
                    instanceId, peId, executionId, nodeId, nodeName, nodeType));
        }
    }

    public void publishInstanceCompleted(String instanceId, String status, Instant completedAt) {
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new WorkflowRuntimeEvents.InstanceCompletedEvent(
                    instanceId, status, completedAt));
        }
    }
}
