package com.acme.workflow.runtime.context;

import com.acme.workflow.common.Jsons;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.runtime.domain.ParticipantExecutionEntity;
import com.acme.workflow.runtime.domain.WorkflowInstanceEntity;
import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.acme.workflow.runtime.repository.ParticipantExecutionRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

@Service
public class ExecutionContextManager {

    private final WorkflowInstanceRepository instances;
    private final ParticipantExecutionRepository participants;
    private final NodeExecutionRepository executions;
    private final DirectoryService directory;
    private final Jsons jsons;

    public ExecutionContextManager(WorkflowInstanceRepository instances,
                                  ParticipantExecutionRepository participants,
                                  NodeExecutionRepository executions,
                                  DirectoryService directory,
                                  Jsons jsons) {
        this.instances = instances;
        this.participants = participants;
        this.executions = executions;
        this.directory = directory;
        this.jsons = jsons;
    }

    public ObjectNode buildContext(String instanceId, String peId) {
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        ObjectNode context = jsons.object();
        context.set("trigger", jsons.read(instance.triggerData));
        context.set("variables", jsons.read(instance.variablesData));
        if (instance.contextData != null && !instance.contextData.isBlank()) {
            JsonNode ctxNode = jsons.read(instance.contextData);
            if (ctxNode.isObject()) {
                ctxNode.fields().forEachRemaining(entry -> context.set(entry.getKey(), entry.getValue()));
            }
        }
        JsonNode participantValue = jsons.read(pe.participantSnapshot);
        ObjectNode participant = participantValue.isObject() ? ((ObjectNode) participantValue).deepCopy()
                : jsons.object();
        if (!participant.has("name") && participant.has("displayName"))
            participant.set("name", participant.get("displayName"));
        if (!participant.has("departmentId") && participant.has("organizationUnitId"))
            participant.set("departmentId", participant.get("organizationUnitId"));
        context.set("participant", participant);
        ObjectNode instanceContext = jsons.object().put("id", instance.id).put("requestCode", instance.requestCode)
                .put("workflowId", instance.workflowId).put("workflowVersionId", instance.workflowVersionId)
                .put("creatorId", instance.creatorId).put("status", instance.status);
        if (instance.startedAt != null)
            instanceContext.put("startedAt", instance.startedAt.toString());
        context.set("instance", instanceContext);
        try {
            ObjectNode creator = (ObjectNode) jsons.value(directory.user(instance.creatorId));
            if (!creator.has("name") && creator.has("displayName"))
                creator.set("name", creator.get("displayName"));
            context.set("currentUser", creator);
        } catch (RuntimeException ignored) {
            context.set("currentUser", jsons.object().put("id", instance.creatorId));
        }
        ObjectNode nodeOutputs = jsons.object();
        executions.findByParticipantExecutionIdAndStateOrderByStartedAtAsc(peId, "COMPLETED").forEach(execution -> {
            JsonNode output = jsons.read(execution.outputData);
            ObjectNode nodeContext = output.isObject() ? ((ObjectNode) output).deepCopy()
                    : jsons.object().set("value", output);
            nodeContext.set("output", output.deepCopy());
            nodeOutputs.set(execution.nodeId, nodeContext);
        });
        context.set("nodes", nodeOutputs);
        return context;
    }
}
