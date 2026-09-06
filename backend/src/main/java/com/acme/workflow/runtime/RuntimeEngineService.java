package com.acme.workflow.runtime;

import com.acme.workflow.auth.*;
import com.acme.workflow.common.*;
import com.acme.workflow.directory.*;
import com.acme.workflow.identity.domain.*;
import com.acme.workflow.identity.repository.*;
import com.acme.workflow.integration.IntegrationService;
import com.acme.workflow.runtime.domain.*;
import com.acme.workflow.runtime.executor.*;
import com.acme.workflow.runtime.repository.*;
import com.acme.workflow.workflow.WorkflowService;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class RuntimeEngineService {
    private static final Set<String> HUMAN = Set.of("ASSIGNMENT", "APPROVAL", "REVIEW", "FORM");
    private static final Set<String> OPEN_TASK = Set.of("PENDING", "CLAIMED", "IN_PROGRESS");
    private final WorkflowInstanceRepository instances;
    private final ParticipantExecutionRepository participants;
    private final NodeExecutionRepository executions;
    private final WorkflowTaskRepository tasks;
    private final TaskSubmissionRepository submissions;
    private final TaskCandidateUserRepository candidates;
    private final EvaluationResultRepository evaluations;
    private final NotificationDeliveryRepository notifications;
    private final RuntimeEventRepository events;
    private final RuntimeJobRepository jobs;
    private final WaitSubscriptionRepository waits;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final SystemRoleRepository roles;
    private final UserRoleAssignmentRepository roleAssignments;
    private final Jsons jsons;
    private final WorkflowService workflows;
    private final WorkflowVersionRepository workflowVersions;
    private final DirectoryService directory;
    private final DirectoryGroupService groups;
    private final RuntimeValueResolver resolver;
    private final IntegrationService integrations;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;
    private final NodeExecutorFactory nodeExecutorFactory;
    private final int maxSyncDepth;

    public RuntimeEngineService(WorkflowInstanceRepository instances, ParticipantExecutionRepository participants,
            NodeExecutionRepository executions, WorkflowTaskRepository tasks,
            TaskSubmissionRepository submissions, TaskCandidateUserRepository candidates,
            EvaluationResultRepository evaluations, NotificationDeliveryRepository notifications,
            RuntimeEventRepository events, RuntimeJobRepository jobs, WaitSubscriptionRepository waits,
            HrmUserRepository users, OrganizationUnitRepository organizations,
            SystemRoleRepository roles, UserRoleAssignmentRepository roleAssignments,
            Jsons jsons, WorkflowService workflows, WorkflowVersionRepository workflowVersions,
            DirectoryService directory, DirectoryGroupService groups, RuntimeValueResolver resolver,
            IntegrationService integrations, CurrentUserService current, PermissionService permissions,
            AuditService audit, NodeExecutorFactory nodeExecutorFactory,
            @Value("${app.runtime.max-sync-depth:200}") int maxSyncDepth) {
        this.instances = instances;
        this.participants = participants;
        this.executions = executions;
        this.tasks = tasks;
        this.submissions = submissions;
        this.candidates = candidates;
        this.evaluations = evaluations;
        this.notifications = notifications;
        this.events = events;
        this.jobs = jobs;
        this.waits = waits;
        this.users = users;
        this.organizations = organizations;
        this.roles = roles;
        this.roleAssignments = roleAssignments;
        this.jsons = jsons;
        this.workflows = workflows;
        this.workflowVersions = workflowVersions;
        this.directory = directory;
        this.groups = groups;
        this.resolver = resolver;
        this.integrations = integrations;
        this.current = current;
        this.permissions = permissions;
        this.audit = audit;
        this.nodeExecutorFactory = nodeExecutorFactory;
        this.maxSyncDepth = maxSyncDepth;
    }

    public Jsons getJsons() {
        return jsons;
    }

    public RuntimeValueResolver getResolver() {
        return resolver;
    }

    @Transactional
    public Map<String, Object> start(String workflowId, ObjectNode request) {
        String actor = current.id();
        permissions.require(actor, "INSTANCE_START", null);
        return startWithActor(workflowId, request, actor, null, null);
    }

    @Transactional
    public Map<String, Object> startSystem(String workflowId, ObjectNode request, String actor) {
        return startWithActor(workflowId, request, actor, null, null);
    }

    private Map<String, Object> startWithActor(String workflowId, ObjectNode request, String actor,
            String parentInstanceId, String parentNodeExecutionId) {
        WorkflowVersionEntity version = workflows.activeVersion(workflowId);
        ObjectNode definition = jsons.object(version.definitionSnapshot);
        String idempotency = nullable(request.path("idempotencyKey").asText(null));
        if (idempotency != null) {
            Optional<WorkflowInstanceEntity> existing = instances.findByWorkflowIdAndIdempotencyKey(workflowId,
                    idempotency);
            if (existing.isPresent())
                return Map.of("id", existing.get().id, "idempotentReplay", true, "status", existing.get().status);
        }
        List<Map<String, Object>> resolved = resolveParticipants(definition, request);
        if (resolved.isEmpty())
            throw ApiException.badRequest("EMPTY_PARTICIPANTS", "Participant resolver không trả về người dùng nào");
        ObjectNode variables = resolveVariables(definition, request.path("variables"));
        WorkflowInstanceEntity instance = new WorkflowInstanceEntity();
        instance.id = Ids.uuid();
        instance.requestCode = request.path("requestCode").asText(generateRequestCode(workflowId));
        instance.workflowId = workflowId;
        instance.workflowVersionId = version.id;
        instance.creatorId = actor;
        instance.status = "RUNNING";
        JsonNode trigger = request.has("triggerData") ? request.path("triggerData") : request.path("trigger");
        instance.triggerData = jsons.write(trigger);
        instance.variablesData = jsons.write(variables);
        instance.contextData = "{}";
        instance.idempotencyKey = idempotency;
        instance.parentInstanceId = parentInstanceId;
        instance.parentNodeExecutionId = parentNodeExecutionId;
        instance.startedAt = Instant.now();
        instance.updatedAt = instance.startedAt;
        instances.saveAndFlush(instance);
        event(instance.id, null, null, "TRIGGER", "Khởi tạo workflow", resolved.size() + " participant được snapshot",
                "SUCCESS", actor,
                Map.of("workflowVersion", version.versionNo, "participantCount", resolved.size()));
        String startNode = startNode(definition);
        for (Map<String, Object> user : resolved) {
            ParticipantExecutionEntity pe = new ParticipantExecutionEntity();
            pe.id = Ids.uuid();
            pe.instanceId = instance.id;
            pe.userId = (String) user.get("id");
            pe.participantSnapshot = jsons.write(user);
            pe.status = "IN_PROGRESS";
            pe.startedAt = Instant.now();
            participants.saveAndFlush(pe);
            event(instance.id, pe.id, null, "PARTICIPANT_RESOLVED", "Đã xác định participant",
                    String.valueOf(user.get("displayName")), "SUCCESS", null, user);
            sendParticipantStart(definition, instance.id, pe.id, user, variables);
            executeNode(instance.id, pe.id, startNode, definition, 0);
        }
        audit.append(actor, "TRIGGER", "INSTANCE", instance.id, null, null,
                Map.of("requestCode", instance.requestCode, "participantCount", resolved.size()), null);
        return Map.of("id", instance.id, "requestCode", instance.requestCode, "status", instance.status,
                "participantCount", resolved.size(), "workflowVersion", version.versionNo);
    }

    private List<Map<String, Object>> resolveParticipants(ObjectNode definition, ObjectNode request) {
        LinkedHashMap<String, Map<String, Object>> unique = new LinkedHashMap<>();
        JsonNode explicit = request.path("participantUserIds");
        if (explicit.isArray() && !explicit.isEmpty()) {
            explicit.forEach(id -> addActive(unique, id.asText()));
            return new ArrayList<>(unique.values());
        }
        JsonNode scope = definition.path("participantScope"), cfg = scope.path("selectorConfig");
        String kind = scope.path("scopeKind").asText("all_active");
        List<Map<String, Object>> result = new ArrayList<>();
        switch (kind) {
            case "fixed_users" -> cfg.path("userIds").forEach(id -> {
                try {
                    result.add(directory.user(id.asText()));
                } catch (ApiException ignored) {
                }
            });
            case "department" -> {
                String orgId = cfg.path("organizationUnitId").asText(cfg.path("departmentId").asText());
                result.addAll(directory.users(null, "ACTIVE", orgId, true));
            }
            case "role" -> {
                String key = cfg.path("systemRoleCode").asText(cfg.path("role").asText());
                roles.findByCode(key).or(() -> roles.findById(key))
                        .ifPresent(role -> roleAssignments.findByRoleIdIn(List.of(role.id)).forEach(a -> {
                            try {
                                result.add(directory.user(a.userId));
                            } catch (ApiException ignored) {
                            }
                        }));
            }
            case "from_trigger" -> {
                JsonNode value = resolver.path(request.path("triggerData"), cfg.path("triggerField").asText());
                if (value.isArray())
                    value.forEach(id -> {
                        try {
                            result.add(directory.user(id.asText()));
                        } catch (ApiException ignored) {
                        }
                    });
                else if (value.isTextual())
                    result.add(directory.user(value.asText()));
            }
            default -> result.addAll(directory.users(null, "ACTIVE", null, true));
        }
        result.stream().filter(user -> "Active".equals(user.get("status")))
                .forEach(user -> unique.put((String) user.get("id"), user));
        return new ArrayList<>(unique.values());
    }

    private void addActive(Map<String, Map<String, Object>> target, String id) {
        try {
            Map<String, Object> user = directory.user(id);
            if ("Active".equals(user.get("status")))
                target.put(id, user);
        } catch (ApiException ignored) {
        }
    }

    private ObjectNode resolveVariables(ObjectNode definition, JsonNode overrides) {
        ObjectNode result = jsons.object();
        definition.path("variables").forEach(variable -> {
            JsonNode value = variable.path("defaultValue");
            if ("CONSTANT".equals(value.path("kind").asText()))
                result.set(variable.path("key").asText(), value.path("value"));
        });
        if (overrides.isObject())
            overrides.fields().forEachRemaining(entry -> result.set(entry.getKey(), entry.getValue()));
        return result;
    }

    private String startNode(ObjectNode definition) {
        for (JsonNode node : definition.path("nodes"))
            if ("START".equalsIgnoreCase(node.path("type").asText()))
                return node.path("id").asText();
        throw ApiException.badRequest("NO_START_NODE", "Workflow version không có START node");
    }

    private void executeNode(String instanceId, String peId, String nodeId, ObjectNode definition, int depth) {
        if (depth > maxSyncDepth) {
            scheduleContinuation(instanceId, peId, nodeId, "depth:" + Ids.uuid());
            return;
        }
        ParticipantExecutionEntity participant = participants.findById(peId).orElseThrow();
        if (!"IN_PROGRESS".equals(participant.status))
            return;
        JsonNode node = findNode(definition, nodeId);
        String type = node.path("type").asText().toUpperCase(Locale.ROOT);
        int iteration = (int) executions.countByParticipantExecutionIdAndNodeId(peId, nodeId);
        if (iteration >= definition.path("settings").path("maxIterations").asInt(100)) {
            failParticipant(instanceId, peId, "MAX_ITERATIONS", "Vượt maxIterations tại node " + nodeId);
            return;
        }
        ObjectNode context = context(instanceId, peId);
        NodeExecutionEntity execution = new NodeExecutionEntity();
        execution.id = Ids.uuid();
        execution.instanceId = instanceId;
        execution.participantExecutionId = peId;
        execution.nodeId = nodeId;
        execution.nodeType = type;
        execution.iterationNo = iteration;
        execution.state = "RUNNING";
        execution.inputSnapshot = jsons.write(context);
        execution.outputData = "{}";
        execution.startedAt = Instant.now();
        executions.saveAndFlush(execution);
        participant.currentNodeId = nodeId;
        participant.iterationNo = iteration;
        participants.save(participant);
        event(instanceId, peId, execution.id, "NODE_STARTED", node.path("name").asText(nodeId), "Bắt đầu node " + type,
                "RUNNING", null, Map.of("nodeId", nodeId, "iteration", iteration));
        if (HUMAN.contains(type)) {
            createTasks(instanceId, peId, execution, node, context);
            return;
        }
        try {
            NodeExecutor executor = nodeExecutorFactory.getExecutor(type);
            NodeExecutionContext ctx = new NodeExecutionContext(
                    instanceId, peId, execution, node, definition, context, depth, this);
            executor.execute(ctx);
        } catch (RuntimeException error) {
            technicalFailure(instanceId, peId, execution, node, definition, error, depth);
        }
    }

    private void createTasks(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode context) {
        JsonNode config = node.path("config");
        JsonNode assignee = config.has("assigneeResolver") ? config.path("assigneeResolver") : config.path("assignee");
        List<String> resolved = resolveAssignees(assignee, context, instanceId);
        if (resolved.isEmpty()) {
            failExecution(execution, "ASSIGNEE_NOT_FOUND", "Không resolve được assignee");
            failParticipant(instanceId, peId, "ASSIGNEE_NOT_FOUND", "Không resolve được assignee");
            return;
        }
        String mode = config.path("assignmentMode").asText(config.path("executionMode").asText("DIRECT_ONE"))
                .toUpperCase(Locale.ROOT);
        if ("SINGLE".equals(mode))
            mode = "DIRECT_ONE";
        if ("ALL".equals(mode))
            mode = "DIRECT_ALL";
        List<String> taskAssignees = "DIRECT_ALL".equals(mode) ? resolved
                : List.of("CLAIMABLE_POOL".equals(mode) ? "" : resolved.getFirst());
        for (String assigneeId : taskAssignees) {
            WorkflowTaskEntity task = new WorkflowTaskEntity();
            task.id = Ids.uuid();
            task.instanceId = instanceId;
            task.participantExecutionId = peId;
            task.nodeExecutionId = execution.id;
            task.nodeId = node.path("id").asText();
            task.taskType = node.path("type").asText().toUpperCase(Locale.ROOT);
            task.title = resolver.render(config.path("title").asText(node.path("name").asText()), context);
            task.description = resolver.render(config.path("description").asText(""), context);
            task.assigneeId = assigneeId.isBlank() ? null : assigneeId;
            task.status = "PENDING";
            task.dueAt = dueAt(config);
            task.priority = config.path("priority").asText(task.dueAt == null ? "NORMAL" : "HIGH");
            task.formSchema = jsons.write(materializeFields(config.path("formFields"), context));
            task.allowedActions = jsons.write(allowedActions(task.taskType, config));
            ObjectNode snapshot = jsons.object();
            snapshot.put("assignmentMode", mode);
            snapshot.set("completionPolicy", config.path("completionPolicy"));
            snapshot.set("candidateUserIds", jsons.value(resolved));
            task.resolutionSnapshot = jsons.write(snapshot);
            task.createdAt = Instant.now();
            tasks.saveAndFlush(task);
            if ("CLAIMABLE_POOL".equals(mode))
                resolved.forEach(userId -> {
                    TaskCandidateUserEntity candidate = new TaskCandidateUserEntity();
                    candidate.taskId = task.id;
                    candidate.userId = userId;
                    candidates.save(candidate);
                });
            event(instanceId, peId, execution.id, "TASK_ASSIGNED", node.path("name").asText(), "Task đã được giao",
                    "WAITING", null, Map.of("taskId", task.id, "assigneeIds", resolved, "assignmentMode", mode));
            sendTaskNotification(instanceId, task, config.path("channels"), resolved);
            scheduleSla(task, config);
        }
        execution.state = "WAITING";
        executions.save(execution);
    }

    private List<String> resolveAssignees(JsonNode config, ObjectNode context, String instanceId) {
        String type = config.path("type").asText("fixed").toLowerCase(Locale.ROOT);
        String value = assigneeValue(config.path("value"), context);
        LinkedHashSet<String> result = new LinkedHashSet<>();
        switch (type) {
            case "fixed", "fixed_user" -> result.add(value);
            case "current_participant" -> result.add(context.path("participant").path("id").asText(null));
            case "participant_manager" -> result.add(context.path("participant").path("managerId").asText(null));
            case "creator_manager" -> result.add(instances.findById(instanceId)
                    .flatMap(i -> users.findById(i.creatorId)).map(u -> u.managerId).orElse(null));
            case "department_head" ->
                result.add(organizations.findById(context.path("participant").path("organizationUnitId").asText())
                        .map(o -> o.headUserId).orElse(null));
            case "group" -> result.addAll(groups.activeMemberIds(value));
            case "role" -> roles.findByCode(value).or(() -> roles.findById(value))
                    .ifPresent(role -> roleAssignments.findByRoleIdIn(List.of(role.id)).stream()
                            .filter(a -> inScope(a.organizationScopeId,
                                    context.path("participant").path("organizationUnitId").asText()))
                            .forEach(a -> result.add(a.userId)));
            case "dynamic" -> {
                JsonNode dynamic = resolver.path(context, value);
                if (dynamic.isArray())
                    dynamic.forEach(v -> result.add(v.asText()));
                else
                    result.add(dynamic.asText(null));
            }
            default -> result.add(value);
        }
        result.removeIf(Objects::isNull);
        result.removeIf(String::isBlank);
        result.removeIf(id -> users.findById(id).map(u -> !"ACTIVE".equals(u.status)).orElse(true));
        if (result.isEmpty() && config.path("fallback").isObject())
            return resolveAssignees(config.path("fallback"), context, instanceId);
        return result.stream().sorted().toList();
    }

    private boolean inScope(String scopeId, String participantOrgId) {
        if (scopeId == null)
            return true;
        return organizations.findById(participantOrgId).flatMap(
                org -> organizations.findById(scopeId).map(scope -> org.hierarchyPath.startsWith(scope.hierarchyPath)))
                .orElse(false);
    }

    private String assigneeValue(JsonNode value, ObjectNode context) {
        if (value.isObject()) {
            String kind = value.path("kind").asText();
            if ("REFERENCE".equals(kind))
                return resolver.path(context, value.path("path").asText()).asText();
            if ("CONSTANT".equals(kind))
                return value.path("value").asText();
        }
        return value.asText();
    }

    private ArrayNode materializeFields(JsonNode fields, ObjectNode context) {
        ArrayNode result = jsons.mapper().createArrayNode();
        if (fields.isArray())
            fields.forEach(field -> {
                ObjectNode copy = field.deepCopy();
                if (field.has("defaultValue")) {
                    RuntimeValueResolver.Resolution resolution = resolver.resolve(field.path("defaultValue"), context);
                    copy.set("resolvedValue", resolution.value());
                    copy.put("bindingStatus",
                            resolution.resolved() ? "RESOLVED" : resolution.error() == null ? "MISSING" : "ERROR");
                    if (resolution.firstMissingPath() != null)
                        copy.put("bindingPath", resolution.firstMissingPath());
                    if (resolution.error() != null)
                        copy.put("bindingError", resolution.error());
                    else if (!resolution.resolved())
                        copy.put("bindingError", "Không tìm thấy dữ liệu cho ${" + resolution.firstMissingPath() + "}");
                }
                if (field.has("visibleWhen"))
                    copy.put("visible", resolver.evaluate(field.path("visibleWhen").asText(), context));
                if (field.has("optionsSource")) {
                    RuntimeValueResolver.Resolution options = resolver.resolve(field.path("optionsSource"), context);
                    if (options.resolved() && options.value().isArray())
                        copy.set("options", options.value());
                    else if (!options.resolved() && !copy.has("bindingError"))
                        copy.put("bindingError",
                                "Không resolve được nguồn options: ${" + options.firstMissingPath() + "}");
                }
                result.add(copy);
            });
        return result;
    }

    private ArrayNode allowedActions(String type, JsonNode config) {
        ArrayNode result = jsons.mapper().createArrayNode();
        JsonNode configured = config.path("allowedActions");
        if (configured.isArray() && !configured.isEmpty()) {
            configured.forEach(result::add);
            return result;
        }
        result.add("COMPLETE");
        if (Set.of("APPROVAL", "REVIEW", "ASSIGNMENT").contains(type))
            result.add("REJECT");
        return result;
    }

    @Transactional
    public Map<String, Object> claim(String taskId) {
        String actor = current.id();
        WorkflowTaskEntity task = lockedTask(taskId);
        ensureActor(actor, task);
        if (!"PENDING".equals(task.status))
            throw ApiException.badRequest("TASK_NOT_CLAIMABLE", "Task không còn PENDING");
        task.status = "CLAIMED";
        task.claimantId = actor;
        task.claimedAt = Instant.now();
        tasks.saveAndFlush(task);
        event(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_CLAIMED", "Task đã được nhận",
                taskId, "RUNNING", actor, Map.of());
        return Map.of("success", true, "taskId", taskId, "claimedBy", actor, "message", "Task claimed successfully");
    }

    @Transactional
    public Map<String, Object> act(String taskId, String action, ObjectNode request) {
        return actAs(taskId, action, request, current.id());
    }

    private Map<String, Object> actAs(String taskId, String action, ObjectNode request, String actor) {
        String normalized = action.toUpperCase(Locale.ROOT);
        if (!Set.of("COMPLETE", "REJECT", "REQUEST_CHANGE").contains(normalized))
            throw ApiException.badRequest("INVALID_ACTION", "Action không hỗ trợ");
        WorkflowTaskEntity task = lockedTask(taskId);
        ensureActor(actor, task);
        if (!OPEN_TASK.contains(task.status))
            throw ApiException.badRequest("TASK_ALREADY_CLOSED", "Task đã được xử lý");
        ObjectNode resolution = jsons.object(task.resolutionSnapshot);
        if ("CLAIMABLE_POOL".equals(resolution.path("assignmentMode").asText()) && !actor.equals(task.claimantId))
            throw ApiException.badRequest("TASK_MUST_BE_CLAIMED", "Task pool phải được claim trước khi xử lý");
        ArrayNode fields = (ArrayNode) jsons.read(task.formSchema);
        JsonNode data = request.has("data") ? request.path("data") : request;
        ObjectNode output = normalizeSubmission(fields, data);
        if ("COMPLETE".equals(normalized))
            validateSubmission(fields, output);
        TaskSubmissionEntity submission = new TaskSubmissionEntity();
        submission.id = Ids.uuid();
        submission.taskId = task.id;
        submission.revisionNo = (int) submissions.countByTaskId(task.id) + 1;
        submission.action = normalized;
        submission.actorId = actor;
        submission.formData = jsons.write(output);
        submission.commentText = request.path("comment").asText(null);
        submission.createdAt = Instant.now();
        submissions.save(submission);
        task.status = "COMPLETE".equals(normalized) ? "COMPLETED"
                : "REJECT".equals(normalized) ? "REJECTED" : "REQUEST_CHANGE";
        task.completedAt = Instant.now();
        tasks.saveAndFlush(task);
        NodeExecutionEntity execution = executions.findById(task.nodeExecutionId).orElseThrow();
        String port = outcome(execution.nodeType, normalized);
        boolean routeNow = !"COMPLETE".equals(normalized) || completionReached(task.nodeExecutionId, resolution);
        if (routeNow) {
            cancelSiblingTasks(task);
            completeExecution(execution, "COMPLETED", port, output);
            event(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_" + task.status,
                    "Hoàn thành task", task.id, "SUCCESS", actor, output);
            route(task.instanceId, task.participantExecutionId, findNode(definition(task.instanceId), task.nodeId),
                    definition(task.instanceId), port, 0);
        } else
            event(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_VOTE_RECORDED",
                    "Đã ghi nhận kết quả task", "Đang chờ completion policy", "WAITING", actor, output);
        audit.append(actor, normalized, "TASK", task.id, null, null, output,
                Map.of("outcomePort", port, "routed", routeNow));
        return Map.of("success", true, "taskId", task.id, "status", task.status, "outcomePort", port, "routed",
                routeNow);
    }

    private boolean completionReached(String executionId, ObjectNode resolution) {
        List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(executionId);
        long completed = siblings.stream().filter(t -> "COMPLETED".equals(t.status)).count();
        String policy = resolution.path("completionPolicy").path("policy").asText("ALL").toUpperCase(Locale.ROOT);
        return switch (policy) {
            case "ANY" -> completed >= 1;
            case "THRESHOLD" -> {
                double threshold = resolution.path("completionPolicy").path("threshold").asDouble(1);
                String unit = resolution.path("completionPolicy").path("thresholdUnit").asText("COUNT");
                yield "PERCENTAGE".equals(unit) ? completed * 100.0 / siblings.size() >= threshold
                        : completed >= threshold;
            }
            default -> completed == siblings.size();
        };
    }

    private void cancelSiblingTasks(WorkflowTaskEntity currentTask) {
        tasks.findByNodeExecutionIdOrderByCreatedAtAsc(currentTask.nodeExecutionId).stream()
                .filter(t -> !t.id.equals(currentTask.id) && OPEN_TASK.contains(t.status)).forEach(t -> {
                    t.status = "CANCELLED";
                    t.completedAt = Instant.now();
                    tasks.save(t);
                });
    }

    private String outcome(String type, String action) {
        if ("REJECT".equals(action))
            return "REJECTED";
        if ("REQUEST_CHANGE".equals(action))
            return "REQUEST_CHANGE";
        return switch (type) {
            case "APPROVAL" -> "APPROVED";
            case "REVIEW" -> "REVIEW_COMPLETED";
            case "FORM" -> "SUBMITTED";
            default -> "SUCCESS";
        };
    }

    private ObjectNode normalizeSubmission(ArrayNode fields, JsonNode data) {
        ObjectNode result = jsons.object();
        if (data != null && data.isObject())
            data.fields().forEachRemaining(e -> result.set(e.getKey(), e.getValue()));
        fields.forEach(field -> {
            String id = field.path("id").asText(), mapping = field.path("outputMapping").asText(id);
            if (result.has(id) && !result.has(mapping))
                result.set(mapping, result.get(id));
            if (!result.has(mapping) && field.has("resolvedValue"))
                result.set(mapping, field.get("resolvedValue"));
        });
        return result;
    }

    private void validateSubmission(ArrayNode fields, ObjectNode output) {
        List<String> errors = new ArrayList<>();
        fields.forEach(field -> {
            if (field.path("readOnly").asBoolean() || field.has("visible") && !field.path("visible").asBoolean())
                return;
            String key = field.path("outputMapping").asText(field.path("id").asText());
            JsonNode value = output.path(key);
            if (field.path("required").asBoolean()
                    && (value.isMissingNode() || value.isNull() || (value.isTextual() && value.asText().isBlank())))
                errors.add(field.path("label").asText(key) + " là bắt buộc");
            if (value.isNumber()) {
                JsonNode validation = field.path("validation");
                if (validation.has("min") && value.decimalValue().compareTo(validation.path("min").decimalValue()) < 0)
                    errors.add(field.path("label").asText(key) + " phải >= " + validation.path("min").asText());
                if (validation.has("max") && value.decimalValue().compareTo(validation.path("max").decimalValue()) > 0)
                    errors.add(field.path("label").asText(key) + " phải <= " + validation.path("max").asText());
            }
        });
        if (!errors.isEmpty())
            throw ApiException.badRequest("FORM_VALIDATION", String.join("; ", errors));
    }

    public ObjectNode executeSystem(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode context) {
        JsonNode config = node.path("config");
        String action = config.path("action").asText();
        ObjectNode input = jsons.object();
        JsonNode mapping = config.path("inputMapping");
        if (mapping.isObject())
            mapping.fields().forEachRemaining(
                    e -> input.set(e.getKey(), jsons.value(resolver.resolveValue(e.getValue(), context))));
        if ("SAVE_EVALUATION_RESULT".equals(action)) {
            EvaluationResultEntity result = new EvaluationResultEntity();
            result.id = Ids.uuid();
            result.instanceId = instanceId;
            result.participantUserId = input.path("participantId")
                    .asText(context.path("participant").path("id").asText());
            result.periodKey = input.path("period").asText();
            result.selfScore = decimal(input.path("selfScore"));
            result.managerScore = decimal(input.path("managerScore"));
            result.managerCompetency = input.path("managerCompetency").asText(null);
            result.evaluationValid = input.path("evaluationValid").asBoolean();
            result.resultData = jsons.write(input);
            result.status = "FINAL";
            result.createdAt = result.updatedAt = Instant.now();
            evaluations.save(result);
            return jsons.object().put("id", result.id).put("status", result.status).put("evaluationValid",
                    result.evaluationValid);
        }
        String connector = config.path("connectorId").asText(config.path("connectorKey").asText());
        if (connector.isBlank())
            throw ApiException.badRequest("CONNECTOR_REQUIRED", "System action cần connectorId");
        ObjectNode headers = config.path("headers").isObject() ? ((ObjectNode) config.path("headers")).deepCopy()
                : jsons.object();
        headers.fields()
                .forEachRemaining(e -> headers.put(e.getKey(), resolver.render(e.getValue().asText(), context)));
        JsonNode body = config.has("body") ? jsons.value(resolver.resolveValue(config.path("body"), context)) : input;
        return integrations.execute(connector, config.path("method").asText("POST"),
                resolver.render(config.path("path").asText(""), context), headers, body,
                config.path("credentialId").asText(null), execution.id);
    }

    public ObjectNode executeMapping(JsonNode node, ObjectNode context) {
        ObjectNode output = jsons.object();
        JsonNode mapping = node.path("config").path("outputMapping");
        if (!mapping.isObject())
            mapping = node.path("config").path("mapping");
        if (mapping.isObject())
            mapping.fields().forEachRemaining(
                    e -> output.set(e.getKey(), jsons.value(resolver.resolveValue(e.getValue(), context))));
        return output;
    }

    public void waitTimer(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node) {
        Instant due = addDuration(Instant.now(),
                node.path("config").path("duration").asText(node.path("config").path("waitFor").asText()));
        execution.state = "WAITING";
        executions.save(execution);
        createJob("TIMER", instanceId, peId, execution.id, null, "timer:" + execution.id, due, jsons.object());
        event(instanceId, peId, execution.id, "NODE_WAITING", node.path("name").asText(), "Timer chờ đến " + due,
                "WAITING", null, Map.of("dueAt", due));
    }

    public void waitForEvent(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode context) {
        JsonNode config = node.path("config");
        String eventName = config.path("eventName").asText();
        String correlation = resolver.render(config.path("correlationKey").asText(), context);
        WaitSubscriptionEntity wait = new WaitSubscriptionEntity();
        wait.id = Ids.uuid();
        wait.instanceId = instanceId;
        wait.participantExecutionId = peId;
        wait.nodeExecutionId = execution.id;
        wait.eventName = eventName;
        wait.correlationKey = correlation;
        wait.state = "WAITING";
        wait.createdAt = Instant.now();
        String timeout = config.path("timeout").asText();
        if (!timeout.isBlank()) {
            wait.expiresAt = addDuration(Instant.now(), timeout);
            createJob("WAIT_TIMEOUT", instanceId, peId, execution.id, null, "wait-timeout:" + execution.id,
                    wait.expiresAt, jsons.object().put("waitId", wait.id));
        }
        waits.save(wait);
        execution.state = "WAITING";
        executions.save(execution);
        event(instanceId, peId, execution.id, "NODE_WAITING", node.path("name").asText(), "Đang chờ event " + eventName,
                "WAITING", null, Map.of("eventName", eventName, "correlationKey", correlation));
    }

    public void split(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition) {
        List<JsonNode> outgoing = allOutgoing(definition, node.path("id").asText());
        completeExecution(execution, "COMPLETED", "SUCCESS", jsons.object().put("branchCount", outgoing.size()));
        int index = 0;
        for (JsonNode connection : outgoing)
            scheduleContinuation(instanceId, peId, connection.path("targetNodeId").asText(),
                    "split:" + execution.id + ":" + (index++));
        event(instanceId, peId, execution.id, "PARALLEL_SPLIT", "Đã tách nhánh", outgoing.size() + " nhánh", "SUCCESS",
                null, Map.of("branchCount", outgoing.size()));
    }

    public void join(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition, int depth) {
        participants.findLockedById(peId).orElseThrow();
        List<NodeExecutionEntity> arrivals = executions.findByParticipantExecutionIdAndNodeIdOrderByStartedAtAsc(peId,
                node.path("id").asText());
        if (arrivals.stream().anyMatch(e -> "COMPLETED".equals(e.state))) {
            completeExecution(execution, "SKIPPED", "JOINED", jsons.object());
            return;
        }
        String policy = node.path("config").path("joinPolicy").asText("ALL").toUpperCase(Locale.ROOT);
        int expected = (int) definition.path("connections").findValuesAsText("targetNodeId").stream()
                .filter(node.path("id").asText()::equals).count();
        int threshold = "THRESHOLD".equals(policy) ? node.path("config").path("threshold").asInt(expected)
                : "ANY".equals(policy) ? 1 : expected;
        if (arrivals.size() < threshold) {
            execution.state = "WAITING";
            executions.save(execution);
            return;
        }
        arrivals.forEach(item -> {
            if ("WAITING".equals(item.state) || item.id.equals(execution.id))
                completeExecution(item, "COMPLETED", "JOINED", jsons.object().put("arrivals", arrivals.size()));
        });
        if (!"ALL".equals(policy))
            cancelOpenForParticipant(peId);
        route(instanceId, peId, node, definition, "JOINED", depth + 1);
    }

    private void cancelOpenForParticipant(String peId) {
        tasks.findByParticipantExecutionIdOrderByCreatedAtDesc(peId).stream().filter(t -> OPEN_TASK.contains(t.status))
                .forEach(t -> {
                    t.status = "CANCELLED";
                    t.completedAt = Instant.now();
                    tasks.save(t);
                });
    }

    public void subworkflow(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode context) {
        JsonNode config = node.path("config");
        ObjectNode request = jsons.object();
        request.putArray("participantUserIds").add(context.path("participant").path("id").asText());
        request.set("variables", jsons.value(resolver.resolveValue(config.path("inputMapping"), context)));
        request.put("idempotencyKey", "subworkflow:" + execution.id);
        String childId = (String) startWithActor(config.path("workflowRef").asText(), request,
                instances.findById(instanceId).orElseThrow().creatorId, instanceId, execution.id).get("id");
        WorkflowInstanceEntity child = instances.findById(childId).orElseThrow();
        child.parentInstanceId = instanceId;
        child.parentNodeExecutionId = execution.id;
        instances.save(child);
        if ("FIRE_AND_FORGET".equals(config.path("waitPolicy").asText()))
            completeAutomatic(instanceId, peId, execution, node, definition(instanceId), "COMPLETED",
                    jsons.object().put("childInstanceId", childId), 0);
        else {
            execution.state = "WAITING";
            execution.outputData = jsons.write(Map.of("childInstanceId", childId));
            executions.save(execution);
            createJob("SUBWORKFLOW_POLL", instanceId, peId, execution.id, null, "subworkflow:" + execution.id,
                    Instant.now().plusSeconds(5), jsons.object().put("childInstanceId", childId));
        }
    }

    private void technicalFailure(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition, RuntimeException error, int depth) {
        JsonNode retry = node.path("config").path("retryPolicy");
        int max = retry.path("maxAttempts").asInt(0);
        if (max > 0) {
            execution.state = "WAITING";
            execution.errorData = jsons.write(Map.of("message", String.valueOf(error.getMessage())));
            executions.save(execution);
            ObjectNode payload = jsons.object().put("nodeId", node.path("id").asText()).put("attempt", 1)
                    .put("maxAttempts", max);
            createJob("RETRY_NODE", instanceId, peId, execution.id, null, "retry:" + execution.id,
                    Instant.now().plusSeconds(retry.path("backoffSeconds").asLong(5)), payload);
            return;
        }
        failExecution(execution, "NODE_EXECUTION_FAILED", String.valueOf(error.getMessage()));
        if (!outgoing(definition, node.path("id").asText(), "ERROR").isEmpty())
            route(instanceId, peId, node, definition, "ERROR", depth + 1);
        else
            failParticipant(instanceId, peId, "NODE_EXECUTION_FAILED", String.valueOf(error.getMessage()));
    }

    @Transactional
    public Map<String, Object> signal(String eventName, String correlationKey, ObjectNode payload) {
        WaitSubscriptionEntity wait = waits
                .findFirstByEventNameAndCorrelationKeyAndState(eventName, correlationKey, "WAITING")
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy wait subscription"));
        wait.state = "CONSUMED";
        wait.eventPayload = jsons.write(payload);
        wait.consumedAt = Instant.now();
        waits.save(wait);
        NodeExecutionEntity execution = executions.findById(wait.nodeExecutionId).orElseThrow();
        completeExecution(execution, "COMPLETED", "RECEIVED", payload);
        JsonNode node = findNode(definition(wait.instanceId), execution.nodeId);
        route(wait.instanceId, wait.participantExecutionId, node, definition(wait.instanceId), "RECEIVED", 0);
        return Map.of("consumed", true, "instanceId", wait.instanceId, "nodeExecutionId", execution.id);
    }

    @Transactional
    public void handleJob(String jobId) {
        RuntimeJobEntity job = jobs.findById(jobId).orElseThrow();
        if (!"PENDING".equals(job.state) || job.dueAt.isAfter(Instant.now()))
            return;
        job.state = "RUNNING";
        job.lockedAt = Instant.now();
        job.attempts++;
        jobs.saveAndFlush(job);
        try {
            switch (job.jobType) {
                case "CONTINUE" -> executeNode(job.instanceId, job.participantExecutionId,
                        jsons.read(job.payload).path("nodeId").asText(), definition(job.instanceId), 0);
                case "TIMER" -> resumeExecution(job, "TIMEOUT", jsons.object());
                case "WAIT_TIMEOUT" -> timeoutWait(job);
                case "SUBWORKFLOW_POLL" -> pollSubworkflow(job);
                case "RETRY_NODE" -> retryNode(job);
                case "SLA_DUE" -> handleSla(job);
                default -> throw new IllegalStateException("Unknown job type " + job.jobType);
            }
            if ("RUNNING".equals(job.state)) {
                job.state = "COMPLETED";
                job.completedAt = Instant.now();
            }
        } catch (RuntimeException error) {
            job.lastError = String.valueOf(error.getMessage());
            if (job.attempts >= job.maxAttempts) {
                job.state = "FAILED";
                job.completedAt = Instant.now();
                if (job.participantExecutionId != null)
                    failParticipant(job.instanceId, job.participantExecutionId, "JOB_FAILED", job.lastError);
            } else {
                job.state = "PENDING";
                job.dueAt = Instant.now().plusSeconds(Math.min(300, (long) Math.pow(2, job.attempts)));
            }
        }
        jobs.save(job);
    }

    private void resumeExecution(RuntimeJobEntity job, String port, ObjectNode output) {
        NodeExecutionEntity execution = executions.findById(job.nodeExecutionId).orElseThrow();
        if (!"WAITING".equals(execution.state))
            return;
        completeExecution(execution, "COMPLETED", port, output);
        route(job.instanceId, job.participantExecutionId, findNode(definition(job.instanceId), execution.nodeId),
                definition(job.instanceId), port, 0);
    }

    private void timeoutWait(RuntimeJobEntity job) {
        String waitId = jsons.read(job.payload).path("waitId").asText();
        WaitSubscriptionEntity wait = waits.findById(waitId).orElseThrow();
        if (!"WAITING".equals(wait.state))
            return;
        wait.state = "EXPIRED";
        waits.save(wait);
        resumeExecution(job, "TIMEOUT", jsons.object().put("timedOut", true));
    }

    private void pollSubworkflow(RuntimeJobEntity job) {
        String childId = jsons.read(job.payload).path("childInstanceId").asText();
        WorkflowInstanceEntity child = instances.findById(childId).orElseThrow();
        if (Set.of("RUNNING", "PENDING").contains(child.status)) {
            job.state = "PENDING";
            job.dueAt = Instant.now().plusSeconds(5);
            return;
        }
        resumeExecution(job, "COMPLETED", jsons.object().put("childInstanceId", childId).put("status", child.status));
    }

    private void retryNode(RuntimeJobEntity job) {
        ObjectNode payload = jsons.object(job.payload);
        NodeExecutionEntity original = executions.findById(job.nodeExecutionId).orElseThrow();
        original.state = "FAILED";
        original.completedAt = Instant.now();
        executions.save(original);
        executeNode(job.instanceId, job.participantExecutionId, payload.path("nodeId").asText(),
                definition(job.instanceId), 0);
    }

    private void handleSla(RuntimeJobEntity job) {
        WorkflowTaskEntity task = tasks.findById(job.taskId).orElse(null);
        if (task == null || !OPEN_TASK.contains(task.status))
            return;
        ObjectNode payload = jsons.object(job.payload);
        String action = payload.path("action").asText("REMIND").toUpperCase(Locale.ROOT);
        if ("REASSIGN".equals(action) || "ESCALATE".equals(action)) {
            List<String> assignees = resolveAssignees(payload.path("assignee"),
                    context(task.instanceId, task.participantExecutionId), task.instanceId);
            if (!assignees.isEmpty()) {
                task.assigneeId = assignees.getFirst();
                task.claimantId = null;
                task.status = "PENDING";
                tasks.save(task);
            }
        } else if ("REJECT".equals(action)) {
            actAs(task.id, "REJECT", jsons.object().put("comment", "SLA timeout"),
                    instances.findById(task.instanceId).orElseThrow().creatorId);
        }
        List<String> recipients = task.assigneeId == null
                ? candidates.findByTaskId(task.id).stream().map(c -> c.userId).toList()
                : List.of(task.assigneeId);
        recipients.forEach(id -> insertNotification(task.instanceId, task.id, id, "inapp", "Task quá hạn", task.title,
                "sla:" + task.id + ":" + action));
        event(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "SLA_" + action, "SLA action",
                task.title, "SUCCESS", null, payload);
    }

    private void scheduleContinuation(String instanceId, String peId, String nodeId, String dedup) {
        createJob("CONTINUE", instanceId, peId, null, null, dedup, Instant.now(), jsons.object().put("nodeId", nodeId));
    }

    private RuntimeJobEntity createJob(String type, String instanceId, String peId, String executionId, String taskId,
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

    private void scheduleSla(WorkflowTaskEntity task, JsonNode config) {
        if (task.dueAt == null)
            return;
        JsonNode sla = config.path("slaConfig");
        String action = sla.path("onDue").path("action").asText(config.path("slaAction").asText("REMIND"));
        ObjectNode payload = jsons.object().put("action", normalizeSlaAction(action));
        if (sla.path("onDue").path("assignee").isObject())
            payload.set("assignee", sla.path("onDue").path("assignee"));
        createJob("SLA_DUE", task.instanceId, task.participantExecutionId, task.nodeExecutionId, task.id,
                "sla:" + task.id, task.dueAt, payload);
    }

    private String normalizeSlaAction(String value) {
        String normalized = value.toUpperCase(Locale.ROOT);
        if (normalized.contains("NHẮC") || normalized.contains("NHAC"))
            return "REMIND";
        if (normalized.contains("ESCAL"))
            return "ESCALATE";
        if (normalized.contains("REASSIGN"))
            return "REASSIGN";
        if (normalized.contains("REJECT"))
            return "REJECT";
        return normalized;
    }

    public void completeAutomatic(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition, String port, ObjectNode output, int depth) {
        completeExecution(execution, "COMPLETED", port, output);
        event(instanceId, peId, execution.id, "NODE_COMPLETED", node.path("name").asText(), "Outcome: " + port,
                "SUCCESS", null, output);
        route(instanceId, peId, node, definition, port, depth + 1);
    }

    private void route(String instanceId, String peId, JsonNode node, ObjectNode definition, String port, int depth) {
        List<JsonNode> routes = outgoing(definition, node.path("id").asText(), port);
        if (routes.isEmpty()) {
            if ("END".equalsIgnoreCase(node.path("type").asText()))
                completeParticipant(instanceId, peId);
            else
                failParticipant(instanceId, peId, "DEAD_END", "Node không có route cho outcome " + port);
            return;
        }
        routes.forEach(connection -> executeNode(instanceId, peId, connection.path("targetNodeId").asText(), definition,
                depth + 1));
    }

    private List<JsonNode> allOutgoing(ObjectNode definition, String nodeId) {
        List<JsonNode> result = new ArrayList<>();
        definition.path("connections").forEach(c -> {
            if (nodeId.equals(c.path("sourceNodeId").asText()))
                result.add(c);
        });
        result.sort(Comparator.comparingInt(c -> c.path("priority").asInt(Integer.MAX_VALUE)));
        return result;
    }

    private List<JsonNode> outgoing(ObjectNode definition, String nodeId, String port) {
        List<JsonNode> all = allOutgoing(definition, nodeId);
        List<JsonNode> matches = all.stream().filter(c -> port.equalsIgnoreCase(c.path("sourcePort").asText()))
                .toList();
        if (!matches.isEmpty())
            return matches;
        List<JsonNode> defaults = all.stream().filter(c -> c.path("isDefault").asBoolean()).toList();
        return !defaults.isEmpty() ? defaults : List.of();
    }

    public ObjectNode executeNotification(String instanceId, String peId, JsonNode node, ObjectNode context) {
        JsonNode config = node.path("config");
        List<String> recipients = resolveAssignees(config.path("assignee"), context, instanceId);
        String title = resolver.render(config.path("title").asText(node.path("name").asText()), context),
                body = resolver.render(config.path("bodyTemplate").asText(config.path("message").asText()), context);
        List<String> channels = new ArrayList<>();
        config.path("channels").forEach(c -> channels.add(c.asText()));
        for (String recipient : recipients)
            for (String channel : channels)
                insertNotification(instanceId, null, recipient, channel, title, body,
                        "node:" + node.path("id").asText() + ":" + peId + ":" + recipient + ":" + channel);
        return jsons.object().put("recipientCount", recipients.size()).put("deliveryCount",
                recipients.size() * channels.size());
    }

    private void sendParticipantStart(ObjectNode definition, String instanceId, String peId, Map<String, Object> user,
            ObjectNode variables) {
        JsonNode config = definition.path("participantNotification");
        if (!config.path("enabled").asBoolean())
            return;
        ObjectNode context = jsons.object();
        context.set("variables", variables);
        context.set("participant", jsons.value(user));
        config.path("channels")
                .forEach(channel -> insertNotification(instanceId, null, (String) user.get("id"), channel.asText(),
                        resolver.render(config.path("titleTemplate").asText(), context),
                        resolver.render(config.path("bodyTemplate").asText(), context),
                        "start:" + instanceId + ":" + peId + ":" + channel.asText()));
    }

    private void sendTaskNotification(String instanceId, WorkflowTaskEntity task, JsonNode channels,
            List<String> recipients) {
        if (channels.isArray())
            channels.forEach(channel -> recipients.forEach(
                    recipient -> insertNotification(instanceId, task.id, recipient, channel.asText(), task.title,
                            task.description, "task:" + task.id + ":" + recipient + ":" + channel.asText())));
    }

    private void insertNotification(String instanceId, String taskId, String recipient, String channel, String title,
            String body, String dedup) {
        if (recipient == null || notifications.existsByDedupKey(dedup))
            return;
        NotificationDeliveryEntity notice = new NotificationDeliveryEntity();
        notice.id = Ids.uuid();
        notice.instanceId = instanceId;
        notice.taskId = taskId;
        notice.recipientId = recipient;
        notice.channel = channel.toLowerCase(Locale.ROOT);
        notice.titleText = title == null ? "" : title;
        notice.bodyText = body == null ? "" : body;
        notice.dedupKey = dedup;
        notice.createdAt = Instant.now();
        notice.deliveryStatus = "inapp".equals(notice.channel) ? "SENT" : "PENDING";
        notice.sentAt = "SENT".equals(notice.deliveryStatus) ? notice.createdAt : null;
        notice.nextAttemptAt = "PENDING".equals(notice.deliveryStatus) ? notice.createdAt : null;
        notifications.save(notice);
    }

    public ObjectNode context(String instanceId, String peId) {
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        ObjectNode context = jsons.object();
        context.set("trigger", jsons.read(instance.triggerData));
        context.set("variables", jsons.read(instance.variablesData));
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

    public void completeExecution(NodeExecutionEntity execution, String state, String port, ObjectNode output) {
        execution.state = state;
        execution.outcomePort = port;
        execution.outputData = jsons.write(output);
        execution.completedAt = Instant.now();
        executions.saveAndFlush(execution);
    }

    private void failExecution(NodeExecutionEntity execution, String code, String message) {
        execution.state = "FAILED";
        execution.errorData = jsons.write(Map.of("code", code, "message", message == null ? "" : message));
        execution.completedAt = Instant.now();
        executions.save(execution);
    }

    public void completeParticipant(String instanceId, String peId) {
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        if (!"IN_PROGRESS".equals(pe.status))
            return;
        pe.status = "COMPLETED";
        pe.currentNodeId = null;
        pe.completedAt = Instant.now();
        participants.saveAndFlush(pe);
        event(instanceId, peId, null, "PARTICIPANT_COMPLETED", "Hoàn thành workflow", "Participant đã đi tới END",
                "SUCCESS", null, Map.of());
        finishInstanceIfDone(instanceId);
    }

    private void failParticipant(String instanceId, String peId, String code, String message) {
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        pe.status = "FAILED";
        pe.completedAt = Instant.now();
        participants.save(pe);
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        instance.status = "FAILED";
        instance.updatedAt = Instant.now();
        instances.save(instance);
        event(instanceId, peId, null, "EXECUTION_FAILED", "Thực thi thất bại", message, "FAILED", null,
                Map.of("code", code));
    }

    private void finishInstanceIfDone(String instanceId) {
        if (participants.countByInstanceIdAndStatusIn(instanceId, List.of("NOT_STARTED", "IN_PROGRESS")) == 0) {
            WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
            instance.status = participants.countByInstanceIdAndStatus(instanceId, "FAILED") > 0 ? "FAILED"
                    : participants.countByInstanceIdAndStatus(instanceId, "REJECTED") > 0 ? "REJECTED" : "COMPLETED";
            instance.businessOutcome = instance.status;
            instance.completedAt = Instant.now();
            instance.updatedAt = instance.completedAt;
            instances.save(instance);
            event(instanceId, null, null, "INSTANCE_COMPLETED", "Workflow đã kết thúc", instance.status, "SUCCESS",
                    null, Map.of());
        }
    }

    @Transactional
    public Map<String, Object> cancel(String instanceId) {
        String actor = current.id();
        permissions.require(actor, "INSTANCE_START", null);
        WorkflowInstanceEntity instance = instances.findById(instanceId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy instance " + instanceId));
        if (!Set.of("RUNNING", "PENDING").contains(instance.status))
            throw ApiException.badRequest("INSTANCE_NOT_CANCELLABLE", "Chỉ instance đang chạy mới có thể hủy");
        Instant now = Instant.now();
        tasks.findByInstanceIdOrderByCreatedAtAsc(instanceId).stream().filter(t -> OPEN_TASK.contains(t.status))
                .forEach(t -> {
                    t.status = "CANCELLED";
                    t.completedAt = now;
                    tasks.save(t);
                });
        participants.findByInstanceIdOrderByStartedAtAsc(instanceId).stream()
                .filter(p -> Set.of("NOT_STARTED", "IN_PROGRESS").contains(p.status)).forEach(p -> {
                    p.status = "CANCELLED";
                    p.completedAt = now;
                    participants.save(p);
                });
        jobs.cancelPending(instanceId, now);
        instance.status = "CANCELLED";
        instance.businessOutcome = "CANCELLED";
        instance.completedAt = now;
        instance.updatedAt = now;
        instances.save(instance);
        event(instanceId, null, null, "INSTANCE_CANCELLED", "Workflow đã bị hủy", "Hủy bởi " + actor, "CANCELLED",
                actor, Map.of());
        audit.append(actor, "CANCEL", "INSTANCE", instanceId, null, null, Map.of("status", "CANCELLED"), null);
        return Map.of("id", instanceId, "status", "CANCELLED");
    }

    private ObjectNode definition(String instanceId) {
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        return jsons.object(workflowVersions.findById(instance.workflowVersionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy version đã pin")).definitionSnapshot);
    }

    private JsonNode findNode(ObjectNode definition, String id) {
        for (JsonNode node : definition.path("nodes"))
            if (id.equals(node.path("id").asText()))
                return node;
        throw ApiException.badRequest("NODE_NOT_FOUND", "Không tìm thấy node " + id);
    }

    private WorkflowTaskEntity lockedTask(String id) {
        return tasks.findLockedById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy task " + id));
    }

    private void ensureActor(String actor, WorkflowTaskEntity task) {
        if (actor.equals(task.assigneeId) || actor.equals(task.claimantId)
                || candidates.existsByTaskIdAndUserId(task.id, actor)
                || permissions.has(actor, "TASK_MANAGE_ALL", null))
            return;
        throw ApiException.forbidden("Task không được giao cho người dùng hiện tại");
    }

    private Instant dueAt(JsonNode config) {
        String duration = config.path("slaConfig").path("dueIn").asText(config.path("slaDue").asText());
        return duration.isBlank() ? null : addDuration(Instant.now(), duration);
    }

    private Instant addDuration(Instant base, String value) {
        try {
            return base.plus(Duration.parse(value));
        } catch (RuntimeException ignored) {
            try {
                Period period = Period.parse(value);
                return base.atZone(ZoneId.of("Asia/Bangkok")).plus(period).toInstant();
            } catch (RuntimeException legacy) {
                java.util.regex.Matcher matcher = java.util.regex.Pattern
                        .compile("(\\d+)\\s*(ngày|day|giờ|hour|phút|minute)",
                                java.util.regex.Pattern.CASE_INSENSITIVE | java.util.regex.Pattern.UNICODE_CASE)
                        .matcher(value == null ? "" : value);
                if (!matcher.find())
                    throw legacy;
                long amount = Long.parseLong(matcher.group(1));
                String unit = matcher.group(2).toLowerCase(Locale.ROOT);
                return unit.startsWith("ng") || unit.startsWith("day") ? base.plus(Duration.ofDays(amount))
                        : unit.startsWith("gi") || unit.startsWith("hour") ? base.plus(Duration.ofHours(amount))
                                : base.plus(Duration.ofMinutes(amount));
            }
        }
    }

    private BigDecimal decimal(JsonNode value) {
        return value != null && value.isNumber() ? value.decimalValue() : null;
    }

    private String nullable(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private String generateRequestCode(String workflowId) {
        return "WF-" + workflowId + "-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .withZone(ZoneId.of("Asia/Bangkok")).format(Instant.now()) + "-"
                + Ids.uuid().substring(0, 4).toUpperCase(Locale.ROOT);
    }

    private void event(String instanceId, String peId, String executionId, String type, String title,
            String description, String status, String actor, Object data) {
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
}
