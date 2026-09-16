package com.acme.workflow.runtime.task;

import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.runtime.RuntimeValueResolver;
import com.acme.workflow.runtime.domain.NodeExecutionEntity;
import com.acme.workflow.runtime.domain.TaskCandidateUserEntity;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.acme.workflow.runtime.event.RuntimeEventLogger;
import com.acme.workflow.runtime.job.DurationParser;
import com.acme.workflow.runtime.job.RuntimeJobService;
import com.acme.workflow.runtime.notification.RuntimeNotificationService;
import com.acme.workflow.runtime.participant.AssigneeResolverService;
import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.acme.workflow.runtime.repository.TaskCandidateUserRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.runtime.repository.WorkflowTaskRepository;
import com.acme.workflow.workflow.repository.WorkflowDefinitionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class TaskManagementService {

    private final WorkflowTaskRepository tasks;
    private final TaskCandidateUserRepository candidates;
    private final NodeExecutionRepository executions;
    private final WorkflowInstanceRepository instances;
    private final WorkflowDefinitionRepository workflowDefinitions;
    private final HrmUserRepository users;
    private final DirectoryService directory;
    private final RuntimeValueResolver resolver;
    private final DurationParser durationParser;
    private final FormSchemaService formSchemaService;
    private final AssigneeResolverService assigneeResolver;
    private final RuntimeNotificationService notificationService;
    private final RuntimeJobService jobService;
    private final RuntimeEventLogger eventLogger;
    private final Jsons jsons;

    public TaskManagementService(WorkflowTaskRepository tasks,
            TaskCandidateUserRepository candidates,
            NodeExecutionRepository executions,
            WorkflowInstanceRepository instances,
            WorkflowDefinitionRepository workflowDefinitions,
            HrmUserRepository users,
            DirectoryService directory,
            RuntimeValueResolver resolver,
            DurationParser durationParser,
            FormSchemaService formSchemaService,
            AssigneeResolverService assigneeResolver,
            RuntimeNotificationService notificationService,
            RuntimeJobService jobService,
            RuntimeEventLogger eventLogger,
            Jsons jsons) {
        this.tasks = tasks;
        this.candidates = candidates;
        this.executions = executions;
        this.instances = instances;
        this.workflowDefinitions = workflowDefinitions;
        this.users = users;
        this.directory = directory;
        this.resolver = resolver;
        this.durationParser = durationParser;
        this.formSchemaService = formSchemaService;
        this.assigneeResolver = assigneeResolver;
        this.notificationService = notificationService;
        this.jobService = jobService;
        this.eventLogger = eventLogger;
        this.jsons = jsons;
    }

    public boolean createTasks(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode context, ObjectNode definition) {
        JsonNode config = node.path("config");
        JsonNode assignee = config.has("assigneeResolver") ? config.path("assigneeResolver") : config.path("assignee");
        String nodeType = node.path("type").asText().toUpperCase(Locale.ROOT);

        // Item-level per-submission approval:
        if ("APPROVAL".equals(nodeType) || "REVIEW".equals(nodeType)) {
            List<ObjectNode> submissionEntries = collectUpstreamSubmissions(config, context);
            if (!submissionEntries.isEmpty()) {
                log.info(
                        "[createTasks] Detected {} upstream submissions for nodeId={}. Routing to per-submission task creation.",
                        submissionEntries.size(), node.path("id").asText());
                return createPerParticipantApprovalTasks(instanceId, peId, execution, node, config, context, assignee,
                        submissionEntries, definition);
            }
        }

        String creatorId = instances.findById(instanceId).map(i -> i.creatorId).orElse(null);
        List<String> resolved = assigneeResolver.resolveAssignees(assignee, context, instanceId, creatorId);
        if (resolved.isEmpty()) {
            return false;
        }
        String rawMode = config.has("assignmentMode") ? config.path("assignmentMode").asText("")
                : config.path("executionMode").asText("DIRECT_ONE");
        String mode = rawMode.toUpperCase(Locale.ROOT);
        if ("SINGLE".equals(mode) || "ONE".equals(mode) || "DIRECT_ONE".equals(mode)) {
            mode = "DIRECT_ONE";
        } else if ("ALL".equals(mode) || "DIRECT_ALL".equals(mode) || "FOREACHPARTICIPANT".equals(mode)
                || "FOR_EACH".equals(mode) || "EACH".equals(mode) || "FOREACH".equals(mode)) {
            mode = "DIRECT_ALL";
        } else if ("CLAIMABLE_POOL".equals(mode) || "POOL".equals(mode)) {
            mode = "CLAIMABLE_POOL";
        } else {
            mode = "DIRECT_ONE";
        }

        List<String> taskAssignees = "DIRECT_ALL".equals(mode) ? resolved
                : List.of("CLAIMABLE_POOL".equals(mode) ? "" : resolved.getFirst());
        for (String assigneeId : taskAssignees) {
            createSingleTask(instanceId, peId, execution, node, config, context, assigneeId, mode, resolved,
                    definition);
        }
        execution.state = "WAITING";
        executions.save(execution);
        return true;
    }

    @SuppressWarnings("deprecation")
    public List<ObjectNode> collectUpstreamSubmissions(JsonNode config, ObjectNode context) {
        List<ObjectNode> entries = new ArrayList<>();
        String reviewSourceNodeId = config.path("reviewSourceNodeId").asText(null);
        if (reviewSourceNodeId != null && !reviewSourceNodeId.isBlank()) {
            JsonNode formOutput = context.path("nodes").path(reviewSourceNodeId);
            JsonNode submissionList = formOutput.path("submissionList");
            if (submissionList.isArray()) {
                submissionList.forEach(e -> {
                    if (e.isObject())
                        entries.add((ObjectNode) e.deepCopy());
                });
            }
        } else {
            JsonNode nodesCtx = context.path("nodes");
            if (nodesCtx.isObject()) {
                nodesCtx.fields().forEachRemaining(field -> {
                    if (!entries.isEmpty())
                        return;
                    JsonNode submissionList = field.getValue().path("submissionList");
                    if (submissionList.isArray() && submissionList.size() > 0) {
                        submissionList.forEach(e -> {
                            if (e.isObject())
                                entries.add((ObjectNode) e.deepCopy());
                        });
                    }
                });
            }
        }
        return entries;
    }

    private boolean createPerParticipantApprovalTasks(String instanceId, String peId, NodeExecutionEntity execution,
            JsonNode node, JsonNode config, ObjectNode context, JsonNode assigneeConfig,
            List<ObjectNode> submissionEntries, ObjectNode definition) {

        String assigneeType = assigneeConfig.path("type").asText("").toLowerCase(Locale.ROOT);
        boolean managerPerParticipant = "participant_manager".equals(assigneeType)
                || "each_participant_manager".equals(assigneeType);

        String creatorId = instances.findById(instanceId).map(i -> i.creatorId).orElse(null);
        List<String> sharedApprovers = List.of();
        if (!managerPerParticipant) {
            sharedApprovers = assigneeResolver.resolveAssignees(assigneeConfig, context, instanceId, creatorId);
            if (sharedApprovers.isEmpty()) {
                log.warn(
                        "[createPerParticipantApprovalTasks] Could not resolve approver (type={}) for nodeId={}. Falling back to creator_manager.",
                        assigneeType, node.path("id").asText());
                ObjectNode fallbackAssignee = jsons.object().put("type", "creator_manager");
                sharedApprovers = assigneeResolver.resolveAssignees(fallbackAssignee, context, instanceId, creatorId);
            }
            if (sharedApprovers.isEmpty()) {
                return false;
            }
        }

        String mode = "DIRECT_ONE";
        int tasksCreated = 0;

        for (ObjectNode entry : submissionEntries) {
            String participantId = entry.path("userId").asText(null);
            if (participantId == null || participantId.isBlank())
                continue;

            String approverId;
            if (managerPerParticipant) {
                String managerId = users.findById(participantId).map(u -> u.managerId).orElse(null);
                if (managerId == null || managerId.isBlank()) {
                    log.warn("[createPerParticipantApprovalTasks] No manager for participantId={}, skipping.",
                            participantId);
                    continue;
                }
                if (users.findById(managerId).map(u -> !"ACTIVE".equals(u.status)).orElse(true)) {
                    log.warn("[createPerParticipantApprovalTasks] Manager {} is not active, skipping.", managerId);
                    continue;
                }
                approverId = managerId;
            } else {
                approverId = sharedApprovers.getFirst();
            }

            ObjectNode participantContext = context.deepCopy();
            participantContext.set("reviewedParticipantId", jsons.value(participantId));
            participantContext.set("reviewedSubmission", entry.path("data"));
            try {
                ObjectNode participantInfo = (ObjectNode) jsons.value(directory.user(participantId));
                participantContext.set("reviewedParticipant", participantInfo);
            } catch (Exception ignored) {
                participantContext.set("reviewedParticipant", jsons.object().put("id", participantId));
            }

            List<String> approverList = managerPerParticipant ? List.of(approverId) : sharedApprovers;
            createSingleTask(instanceId, peId, execution, node, config, participantContext,
                    approverId, mode, approverList, definition);
            tasksCreated++;
        }

        if (tasksCreated == 0) {
            return false;
        }
        execution.state = "WAITING";
        executions.save(execution);
        return true;
    }

    public void createSingleTask(String instanceId, String peId, NodeExecutionEntity execution,
            JsonNode node, JsonNode config, ObjectNode context, String assigneeId, String mode,
            List<String> candidateIds, ObjectNode definition) {
        WorkflowTaskEntity task = new WorkflowTaskEntity();
        task.id = Ids.uuid();
        task.instanceId = instanceId;
        task.participantExecutionId = peId;
        task.nodeExecutionId = execution.id;
        task.nodeId = node.path("id").asText();
        task.taskType = node.path("type").asText().toUpperCase(Locale.ROOT);
        task.title = resolver.render(config.path("title").asText(node.path("name").asText()), context);
        task.description = resolver.render(config.path("description").asText(""), context);
        task.assigneeId = (assigneeId == null || assigneeId.isBlank()) ? null : assigneeId;
        task.status = "PENDING";
        task.dueAt = durationParser.dueAt(config);
        task.priority = config.path("priority").asText(task.dueAt == null ? "NORMAL" : "HIGH");
        ArrayNode effectiveFields = formSchemaService.resolveEffectiveFormFields(definition, node, config, context);
        task.formSchema = jsons.write(formSchemaService.materializeFields(effectiveFields, context));
        task.allowedActions = jsons.write(formSchemaService.allowedActions(task.taskType, config));
        ObjectNode snapshot = jsons.object();
        snapshot.put("assignmentMode", mode);
        snapshot.set("completionPolicy", config.path("completionPolicy"));
        snapshot.set("candidateUserIds", jsons.value(candidateIds));
        snapshot.set("notificationChannels", config.path("channels"));
        if (context.has("reviewedParticipantId")) {
            snapshot.set("reviewedParticipantId", context.get("reviewedParticipantId"));
            if (context.has("reviewedParticipant")) {
                snapshot.put("reviewedParticipantName",
                        context.path("reviewedParticipant").path("displayName").asText(""));
            }
        }
        if (context.has("reviewedSubmission")) {
            snapshot.set("reviewedSubmission", context.get("reviewedSubmission"));
        }
        if (context.has("ticketId")) {
            snapshot.set("ticketId", context.get("ticketId"));
        }
        if (context.has("ticketCode")) {
            snapshot.set("ticketCode", context.get("ticketCode"));
        }
        if (context.has("categoryId")) {
            snapshot.set("categoryId", context.get("categoryId"));
        }
        if (context.has("formVersionId")) {
            snapshot.set("formVersionId", context.get("formVersionId"));
        }
        if (context.has("formData")) {
            snapshot.set("formData", context.get("formData"));
        }
        if (context.has("initiator")) {
            snapshot.set("initiator", context.get("initiator"));
        }
        task.resolutionSnapshot = jsons.write(snapshot);
        task.createdAt = Instant.now();
        tasks.saveAndFlush(task);
        if ("CLAIMABLE_POOL".equals(mode)) {
            candidateIds.forEach(userId -> {
                TaskCandidateUserEntity candidate = new TaskCandidateUserEntity();
                candidate.taskId = task.id;
                candidate.userId = userId;
                candidates.save(candidate);
            });
        }
        String assigneeNames = candidateIds.stream()
                .map(id -> users.findById(id).map(u -> u.displayName).orElse(id))
                .reduce((a, b) -> a + ", " + b).orElse("Chưa gán");
        eventLogger.logEvent(instanceId, peId, execution.id, "TASK_ASSIGNED", node.path("name").asText(),
                "Giao task '" + task.title + "' cho: " + assigneeNames,
                "WAITING", null, Map.of("taskId", task.id, "taskTitle", task.title, "assigneeIds", candidateIds,
                        "assignmentMode", mode, "assigneeNames", assigneeNames));
        String stepName = node.path("name").asText("");
        String workflowName = instances.findById(instanceId)
                .flatMap(inst -> workflowDefinitions.findById(inst.workflowId))
                .map(def -> def.name)
                .orElse("");
        notificationService.sendTaskNotification(instanceId, task, config.path("channels"), candidateIds, stepName,
                workflowName);
        jobService.scheduleSla(task, config);
    }
}
