package com.acme.workflow.runtime.job;

import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.runtime.domain.RuntimeJobEntity;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.acme.workflow.runtime.repository.RuntimeJobRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class RuntimeJobService {

    private final RuntimeJobRepository jobs;
    private final DurationParser durationParser;
    private final Jsons jsons;

    public RuntimeJobService(RuntimeJobRepository jobs,
                             DurationParser durationParser,
                             Jsons jsons) {
        this.jobs = jobs;
        this.durationParser = durationParser;
        this.jsons = jsons;
    }

    public RuntimeJobEntity createJob(String type, String instanceId, String peId, String executionId, String taskId,
                                      String dedup, Instant due, Object payload) {
        if (jobs.existsByDedupKey(dedup))
            return null;
        RuntimeJobEntity job = new RuntimeJobEntity();
        job.id = Ids.uuid();
        job.instanceId = instanceId;
        job.participantExecutionId = peId;
        job.nodeExecutionId = executionId;
        job.taskId = taskId;
        job.jobType = type;
        job.dedupKey = dedup;
        job.state = "PENDING";
        job.dueAt = due;
        job.payload = jsons.write(payload);
        job.createdAt = Instant.now();
        return jobs.save(job);
    }

    public void scheduleContinuation(String instanceId, String peId, String nodeId, String dedup) {
        createJob("CONTINUE", instanceId, peId, null, null, dedup, Instant.now(), jsons.object().put("nodeId", nodeId));
    }

    public void scheduleSla(WorkflowTaskEntity task, JsonNode config) {
        if (task.dueAt == null)
            return;
        JsonNode sla = config.path("slaConfig");
        String action = sla.path("onDue").path("action").asText(config.path("slaAction").asText("REMIND"));
        ObjectNode payload = jsons.object().put("action", durationParser.normalizeSlaAction(action));
        if (sla.path("onDue").path("assignee").isObject())
            payload.set("assignee", sla.path("onDue").path("assignee"));
        createJob("SLA_DUE", task.instanceId, task.participantExecutionId, task.nodeExecutionId, task.id,
                "sla:" + task.id, task.dueAt, payload);
    }

    public void cancelPending(String instanceId, Instant now) {
        jobs.cancelPending(instanceId, now);
    }
}
