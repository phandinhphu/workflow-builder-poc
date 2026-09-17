package com.acme.workflow.runtime;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.integration.IntegrationService;
import com.acme.workflow.runtime.context.ExecutionContextManager;
import com.acme.workflow.runtime.context.VariableResolverService;
import com.acme.workflow.runtime.domain.*;
import com.acme.workflow.runtime.event.RuntimeEventLogger;
import com.acme.workflow.runtime.executor.NodeExecutionContext;
import com.acme.workflow.runtime.executor.NodeExecutor;
import com.acme.workflow.runtime.executor.NodeExecutorFactory;
import com.acme.workflow.runtime.job.DurationParser;
import com.acme.workflow.runtime.job.RuntimeJobService;
import com.acme.workflow.runtime.notification.RuntimeNotificationService;
import com.acme.workflow.runtime.participant.AssigneeResolverService;
import com.acme.workflow.runtime.participant.ParticipantResolverService;
import com.acme.workflow.runtime.repository.*;
import com.acme.workflow.runtime.routing.ExecutionOrderManager;
import com.acme.workflow.runtime.routing.WorkflowRouter;
import com.acme.workflow.runtime.task.TaskActionResult;
import com.acme.workflow.runtime.task.TaskActionService;
import com.acme.workflow.runtime.task.TaskManagementService;
import com.acme.workflow.workflow.WorkflowService;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class RuntimeEngineService {

    private static final Set<String> HUMAN = Set.of("ASSIGNMENT", "APPROVAL", "REVIEW");
    private static final Set<String> OPEN_TASK = Set.of("PENDING", "CLAIMED", "IN_PROGRESS");

    // Repositories
    private final WorkflowInstanceRepository instances;
    private final ParticipantExecutionRepository participants;
    private final NodeExecutionRepository executions;
    private final WorkflowTaskRepository tasks;
    private final EvaluationResultRepository evaluations;
    private final RuntimeJobRepository jobs;
    private final WaitSubscriptionRepository waits;
    private final TaskCandidateUserRepository candidates;
    private final HrmUserRepository users;
    private final WorkflowVersionRepository workflowVersions;

    // Domain Services & Helpers
    private final Jsons jsons;
    private final WorkflowService workflows;
    private final RuntimeValueResolver resolver;
    private final IntegrationService integrations;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;
    private final NodeExecutorFactory nodeExecutorFactory;

    // Extracted Modularity Services
    private final ExecutionContextManager contextManager;
    private final VariableResolverService variableResolver;
    private final ParticipantResolverService participantResolver;
    private final AssigneeResolverService assigneeResolver;
    private final TaskManagementService taskManagement;
    private final TaskActionService taskAction;
    private final WorkflowRouter router;
    private final ExecutionOrderManager orderManager;
    private final RuntimeJobService jobService;
    private final RuntimeNotificationService notificationService;
    private final RuntimeEventLogger eventLogger;
    private final DurationParser durationParser;

    private final int maxSyncDepth;

    public RuntimeEngineService(WorkflowInstanceRepository instances,
            ParticipantExecutionRepository participants,
            NodeExecutionRepository executions,
            WorkflowTaskRepository tasks,
            EvaluationResultRepository evaluations,
            RuntimeJobRepository jobs,
            WaitSubscriptionRepository waits,
            TaskCandidateUserRepository candidates,
            HrmUserRepository users,
            WorkflowVersionRepository workflowVersions,
            Jsons jsons,
            WorkflowService workflows,
            RuntimeValueResolver resolver,
            IntegrationService integrations,
            CurrentUserService current,
            PermissionService permissions,
            AuditService audit,
            NodeExecutorFactory nodeExecutorFactory,
            ExecutionContextManager contextManager,
            VariableResolverService variableResolver,
            ParticipantResolverService participantResolver,
            AssigneeResolverService assigneeResolver,
            TaskManagementService taskManagement,
            TaskActionService taskAction,
            WorkflowRouter router,
            ExecutionOrderManager orderManager,
            RuntimeJobService jobService,
            RuntimeNotificationService notificationService,
            RuntimeEventLogger eventLogger,
            DurationParser durationParser,
            @Value("${app.runtime.max-sync-depth:200}") int maxSyncDepth) {
        this.instances = instances;
        this.participants = participants;
        this.executions = executions;
        this.tasks = tasks;
        this.evaluations = evaluations;
        this.jobs = jobs;
        this.waits = waits;
        this.candidates = candidates;
        this.users = users;
        this.workflowVersions = workflowVersions;
        this.jsons = jsons;
        this.workflows = workflows;
        this.resolver = resolver;
        this.integrations = integrations;
        this.current = current;
        this.permissions = permissions;
        this.audit = audit;
        this.nodeExecutorFactory = nodeExecutorFactory;
        this.contextManager = contextManager;
        this.variableResolver = variableResolver;
        this.participantResolver = participantResolver;
        this.assigneeResolver = assigneeResolver;
        this.taskManagement = taskManagement;
        this.taskAction = taskAction;
        this.router = router;
        this.orderManager = orderManager;
        this.jobService = jobService;
        this.notificationService = notificationService;
        this.eventLogger = eventLogger;
        this.durationParser = durationParser;
        this.maxSyncDepth = maxSyncDepth;
    }

    public Jsons getJsons() {
        return jsons;
    }

    public RuntimeValueResolver getResolver() {
        return resolver;
    }

    // =========================================================================
    // Workflow Instance Lifecycle
    // =========================================================================

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

    @Transactional
    public Map<String, Object> startWithExecutable(String workflowExecutableId, ObjectNode request, String actor) {
        WorkflowVersionEntity version = workflowVersions.findById(workflowExecutableId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy executable version: " + workflowExecutableId));
        return startWithVersion(version, request, actor, null, null);
    }

    private Map<String, Object> startWithActor(String workflowId, ObjectNode request, String actor,
            String parentInstanceId, String parentNodeExecutionId) {
        WorkflowVersionEntity version = workflows.activeVersion(workflowId);
        return startWithVersion(version, request, actor, parentInstanceId, parentNodeExecutionId);
    }

    private Map<String, Object> startWithVersion(WorkflowVersionEntity version, ObjectNode request, String actor,
            String parentInstanceId, String parentNodeExecutionId) {
        String workflowId = version.workflowId;
        ObjectNode definition = jsons.object(version.definitionSnapshot);
        String idempotency = nullable(request.path("idempotencyKey").asText(null));
        if (idempotency != null) {
            Optional<WorkflowInstanceEntity> existing = instances.findByWorkflowIdAndIdempotencyKey(workflowId,
                    idempotency);
            if (existing.isPresent())
                return Map.of("id", existing.get().id, "idempotentReplay", true, "status", existing.get().status);
        }

        if (actor != null && !request.has("actorId"))
            request.put("actorId", actor);

        List<Map<String, Object>> resolved = participantResolver.resolveParticipants(definition, request);
        if (resolved.isEmpty())
            throw ApiException.badRequest("EMPTY_PARTICIPANTS",
                    "Participant resolver không trả về người dùng nào. Kiểm tra lại executionPattern hoặc participantScope của workflow.");

        ObjectNode variables = variableResolver.resolveVariables(definition, request.path("variables"));
        WorkflowInstanceEntity instance = new WorkflowInstanceEntity();
        String customInstanceId = request.path("instanceId").asText(null);
        instance.id = (customInstanceId != null && !customInstanceId.isBlank()) ? customInstanceId : Ids.uuid();
        instance.requestCode = request.path("requestCode").asText(generateRequestCode(workflowId));
        instance.workflowId = workflowId;
        instance.workflowVersionId = version.id;
        instance.creatorId = actor;
        instance.status = "RUNNING";
        JsonNode trigger = request.has("triggerData") ? request.path("triggerData") : request.path("trigger");
        instance.triggerData = jsons.write(trigger);
        instance.variablesData = jsons.write(variables);
        instance.contextData = request.has("contextData") ? jsons.write(request.get("contextData")) : "{}";
        instance.idempotencyKey = idempotency;
        instance.parentInstanceId = parentInstanceId;
        instance.parentNodeExecutionId = parentNodeExecutionId;
        instance.startedAt = Instant.now();
        instance.updatedAt = instance.startedAt;
        instances.saveAndFlush(instance);

        String actorName = users.findById(actor).map(u -> u.displayName).orElse(actor);
        eventLogger.logEvent(instance.id, null, null, "TRIGGER", "Khởi tạo workflow",
                "Khởi tạo bởi " + actorName + " (" + resolved.size() + " participant)",
                "SUCCESS", actor,
                Map.of("workflowVersion", version.versionNo, "participantCount", resolved.size(), "actorName",
                        actorName));

        String startNode = router.startNode(definition);
        for (Map<String, Object> user : resolved) {
            ParticipantExecutionEntity pe = new ParticipantExecutionEntity();
            pe.id = Ids.uuid();
            pe.instanceId = instance.id;
            pe.userId = (String) user.get("id");
            pe.participantSnapshot = jsons.write(user);
            pe.status = "IN_PROGRESS";
            pe.startedAt = Instant.now();
            participants.saveAndFlush(pe);
            eventLogger.logEvent(instance.id, pe.id, null, "PARTICIPANT_RESOLVED", "Đã xác định participant",
                    "Người tham gia: " + user.get("displayName"), "SUCCESS", null, user);
            notificationService.sendParticipantStart(definition, instance.id, pe.id, user, variables);
            executeNode(instance.id, pe.id, startNode, definition, 0);
        }

        audit.append(actor, "TRIGGER", "INSTANCE", instance.id, null, null,
                Map.of("requestCode", instance.requestCode, "participantCount", resolved.size()), null);
        return Map.of("id", instance.id, "requestCode", instance.requestCode, "status", instance.status,
                "participantCount", resolved.size(), "workflowVersion", version.versionNo);
    }

    // =========================================================================
    // Node Execution & Graph Routing
    // =========================================================================

    private void executeNode(String instanceId, String peId, String nodeId, ObjectNode definition, int depth) {
        if (depth > maxSyncDepth) {
            jobService.scheduleContinuation(instanceId, peId, nodeId, "depth:" + Ids.uuid());
            return;
        }
        ParticipantExecutionEntity participant = participants.findById(peId).orElseThrow();
        if (!"IN_PROGRESS".equals(participant.status))
            return;

        JsonNode node = router.findNode(definition, nodeId);
        String type = node.path("type").asText().toUpperCase(Locale.ROOT);
        int iteration = orderManager.getIteration(peId, nodeId);
        if (orderManager.isMaxIterationsExceeded(iteration, definition.path("settings"))) {
            failParticipant(instanceId, peId, "MAX_ITERATIONS", "Vượt maxIterations tại node " + nodeId);
            return;
        }

        ObjectNode context = contextManager.buildContext(instanceId, peId);
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
        execution.executionOrder = orderManager.nextExecutionOrder(instanceId);
        executions.saveAndFlush(execution);

        participant.currentNodeId = nodeId;
        participant.iterationNo = iteration;
        participants.save(participant);

        eventLogger.logEvent(instanceId, peId, execution.id, "NODE_STARTED", node.path("name").asText(nodeId),
                "Bắt đầu node " + type,
                "RUNNING", null, Map.of("nodeId", nodeId, "iteration", iteration));
        eventLogger.publishNodeStarted(instanceId, peId, execution.id, nodeId, node.path("name").asText(nodeId), type);

        if (HUMAN.contains(type)) {
            boolean created = taskManagement.createTasks(instanceId, peId, execution, node, context, definition);
            if (!created) {
                failExecution(execution, "ASSIGNEE_NOT_FOUND", "Không resolve được assignee");
                failParticipant(instanceId, peId, "ASSIGNEE_NOT_FOUND", "Không resolve được assignee");
            }
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

    public void completeAutomatic(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition, String port, ObjectNode output, int depth) {
        completeExecution(execution, "COMPLETED", port, output);
        eventLogger.logEvent(instanceId, peId, execution.id, "NODE_COMPLETED", node.path("name").asText(),
                "Hoàn thành bước " + node.path("name").asText() + " (Outcome: " + port + ")",
                "SUCCESS", null, output);
        route(instanceId, peId, node, definition, port, depth + 1);
    }

    private void route(String instanceId, String peId, JsonNode node, ObjectNode definition, String port, int depth) {
        List<JsonNode> routes = router.outgoing(definition, node.path("id").asText(), port);
        if (routes.isEmpty()) {
            if ("END".equalsIgnoreCase(node.path("type").asText())) {
                String configuredOutcome = node.path("config").path("endType").asText(node.path("config").path("outcome").asText("APPROVED")).toUpperCase(Locale.ROOT);
                completeParticipant(instanceId, peId, configuredOutcome);
            } else if ("REJECTED".equalsIgnoreCase(port) || "REJECT".equalsIgnoreCase(port))
                rejectParticipant(instanceId, peId, "Yêu cầu bị từ chối phê duyệt");
            else
                failParticipant(instanceId, peId, "DEAD_END", "Node không có route cho outcome " + port);
            return;
        }
        routes.forEach(connection -> executeNode(instanceId, peId, connection.path("targetNodeId").asText(), definition,
                depth + 1));
    }

    // =========================================================================
    // Task User Actions (Claim, Act)
    // =========================================================================

    @Transactional
    public Map<String, Object> claim(String taskId) {
        return taskAction.claim(taskId, current.id());
    }

    @Transactional
    public Map<String, Object> act(String taskId, String action, ObjectNode request) {
        return actAs(taskId, action, request, current.id());
    }

    private Map<String, Object> actAs(String taskId, String action, ObjectNode request, String actor) {
        TaskActionResult result = taskAction.processAction(taskId, action, request, actor);
        if (result.routed()) {
            WorkflowTaskEntity task = tasks.findById(taskId).orElseThrow();
            NodeExecutionEntity execution = executions.findById(task.nodeExecutionId).orElseThrow();
            completeExecution(execution, "COMPLETED", result.outcomePort(), result.finalOutput());
            ObjectNode definition = definition(task.instanceId);
            route(task.instanceId, task.participantExecutionId, router.findNode(definition, task.nodeId), definition,
                    result.outcomePort(), 0);
        }
        return Map.of("success", result.success(), "taskId", result.taskId(), "status", result.status(),
                "outcomePort", result.outcomePort(), "routed", result.routed());
    }

    // =========================================================================
    // Specialized Node Handlers
    // =========================================================================

    @SuppressWarnings("deprecation")
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

    @SuppressWarnings("deprecation")
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

    public ObjectNode executeNotification(String instanceId, String peId, JsonNode node, ObjectNode context) {
        JsonNode config = node.path("config");
        JsonNode assigneeConfig = config.path("assignee");
        String creatorId = instances.findById(instanceId).map(i -> i.creatorId).orElse(null);
        List<String> recipients = assigneeResolver.resolveAssignees(assigneeConfig, context, instanceId, creatorId);
        return notificationService.executeNotification(instanceId, peId, node, context, recipients);
    }

    public void waitTimer(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node) {
        Instant due = durationParser.addDuration(Instant.now(),
                node.path("config").path("duration").asText(node.path("config").path("waitFor").asText()));
        execution.state = "WAITING";
        executions.save(execution);
        jobService.createJob("TIMER", instanceId, peId, execution.id, null, "timer:" + execution.id, due,
                jsons.object());
        eventLogger.logEvent(instanceId, peId, execution.id, "NODE_WAITING", node.path("name").asText(),
                "Timer chờ đến " + due,
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
            wait.expiresAt = durationParser.addDuration(Instant.now(), timeout);
            jobService.createJob("WAIT_TIMEOUT", instanceId, peId, execution.id, null, "wait-timeout:" + execution.id,
                    wait.expiresAt, jsons.object().put("waitId", wait.id));
        }
        waits.save(wait);
        execution.state = "WAITING";
        executions.save(execution);
        eventLogger.logEvent(instanceId, peId, execution.id, "NODE_WAITING", node.path("name").asText(),
                "Đang chờ event " + eventName,
                "WAITING", null, Map.of("eventName", eventName, "correlationKey", correlation));
    }

    public void split(String instanceId, String peId, NodeExecutionEntity execution, JsonNode node,
            ObjectNode definition) {
        List<JsonNode> outgoing = router.allOutgoing(definition, node.path("id").asText());
        completeExecution(execution, "COMPLETED", "SUCCESS", jsons.object().put("branchCount", outgoing.size()));
        int index = 0;
        for (JsonNode connection : outgoing)
            jobService.scheduleContinuation(instanceId, peId, connection.path("targetNodeId").asText(),
                    "split:" + execution.id + ":" + (index++));
        eventLogger.logEvent(instanceId, peId, execution.id, "PARALLEL_SPLIT", "Đã tách nhánh",
                outgoing.size() + " nhánh", "SUCCESS",
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
            jobService.createJob("SUBWORKFLOW_POLL", instanceId, peId, execution.id, null,
                    "subworkflow:" + execution.id,
                    Instant.now().plusSeconds(5), jsons.object().put("childInstanceId", childId));
        }
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
        JsonNode node = router.findNode(definition(wait.instanceId), execution.nodeId);
        route(wait.instanceId, wait.participantExecutionId, node, definition(wait.instanceId), "RECEIVED", 0);
        return Map.of("consumed", true, "instanceId", wait.instanceId, "nodeExecutionId", execution.id);
    }

    // =========================================================================
    // Background Job Execution
    // =========================================================================

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
        route(job.instanceId, job.participantExecutionId, router.findNode(definition(job.instanceId), execution.nodeId),
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
            String creatorId = instances.findById(task.instanceId).map(i -> i.creatorId).orElse(null);
            List<String> assignees = assigneeResolver.resolveAssignees(payload.path("assignee"),
                    contextManager.buildContext(task.instanceId, task.participantExecutionId), task.instanceId,
                    creatorId);
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
        recipients.forEach(id -> notificationService.insertNotification(task.instanceId, task.id, id, "inapp",
                "Task quá hạn", task.title,
                "sla:" + task.id + ":" + action));
        eventLogger.logEvent(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "SLA_" + action,
                "SLA action",
                task.title, "SUCCESS", null, payload);
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
            jobService.createJob("RETRY_NODE", instanceId, peId, execution.id, null, "retry:" + execution.id,
                    Instant.now().plusSeconds(retry.path("backoffSeconds").asLong(5)), payload);
            return;
        }
        failExecution(execution, "NODE_EXECUTION_FAILED", String.valueOf(error.getMessage()));
        if (!router.outgoing(definition, node.path("id").asText(), "ERROR").isEmpty())
            route(instanceId, peId, node, definition, "ERROR", depth + 1);
        else
            failParticipant(instanceId, peId, "NODE_EXECUTION_FAILED", String.valueOf(error.getMessage()));
    }

    // =========================================================================
    // Instance Completion & Termination
    // =========================================================================

    public ObjectNode context(String instanceId, String peId) {
        return contextManager.buildContext(instanceId, peId);
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
        completeParticipant(instanceId, peId, "APPROVED");
    }

    public void completeParticipant(String instanceId, String peId, String outcome) {
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        if (!"IN_PROGRESS".equals(pe.status))
            return;
        pe.status = "COMPLETED";
        pe.currentNodeId = null;
        pe.completedAt = Instant.now();
        participants.saveAndFlush(pe);
        eventLogger.logEvent(instanceId, peId, null, "PARTICIPANT_COMPLETED", "Hoàn thành workflow",
                "Participant đã đi tới END (Outcome: " + outcome + ")",
                "SUCCESS", null, Map.of("outcome", String.valueOf(outcome)));
        finishInstanceIfDone(instanceId, outcome);
    }

    public boolean hasRejectedApproval(String instanceId, String peId) {
        boolean taskRejected = tasks.findByInstanceIdOrderByCreatedAtAsc(instanceId).stream()
                .anyMatch(t -> ("APPROVAL".equalsIgnoreCase(t.taskType) || "REVIEW".equalsIgnoreCase(t.taskType))
                        && "REJECTED".equals(t.status)
                        && (peId == null || peId.equals(t.participantExecutionId)));
        if (taskRejected)
            return true;

        return executions.findByInstanceIdOrderByExecutionOrderAsc(instanceId).stream()
                .anyMatch(ne -> ("APPROVAL".equalsIgnoreCase(ne.nodeType) || "REVIEW".equalsIgnoreCase(ne.nodeType))
                        && "REJECTED".equalsIgnoreCase(ne.outcomePort)
                        && (peId == null || peId.equals(ne.participantExecutionId)));
    }

    public void rejectParticipant(String instanceId, String peId, String message) {
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        if (!"IN_PROGRESS".equals(pe.status))
            return;
        pe.status = "REJECTED";
        pe.currentNodeId = null;
        pe.completedAt = Instant.now();
        participants.saveAndFlush(pe);
        eventLogger.logEvent(instanceId, peId, null, "PARTICIPANT_REJECTED", "Yêu cầu bị từ chối", message,
                "FAILED", null, Map.of());
        finishInstanceIfDone(instanceId, "REJECTED");
    }

    private void failParticipant(String instanceId, String peId, String code, String message) {
        ParticipantExecutionEntity pe = participants.findById(peId).orElseThrow();
        pe.status = "FAILED";
        pe.completedAt = Instant.now();
        participants.save(pe);
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        instance.status = "FAILED";
        instance.failureReason = message;
        instance.updatedAt = Instant.now();
        instances.save(instance);
        eventLogger.logEvent(instanceId, peId, null, "EXECUTION_FAILED", "Thực thi thất bại", message, "FAILED", null,
                Map.of("code", code));
        eventLogger.publishInstanceCompleted(instanceId, "FAILED", null, Instant.now(), message);
    }

    private void finishInstanceIfDone(String instanceId) {
        finishInstanceIfDone(instanceId, null);
    }

    private void finishInstanceIfDone(String instanceId, String outcome) {
        if (participants.countByInstanceIdAndStatusIn(instanceId, List.of("NOT_STARTED", "IN_PROGRESS")) == 0) {
            WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
            boolean hasFailed = participants.countByInstanceIdAndStatus(instanceId, "FAILED") > 0;
            boolean hasRejected = participants.countByInstanceIdAndStatus(instanceId, "REJECTED") > 0;

            if (hasFailed) {
                instance.status = "FAILED";
                instance.businessOutcome = "FAILED";
            } else if (hasRejected) {
                instance.status = "COMPLETED";
                instance.businessOutcome = "REJECTED";
            } else {
                instance.status = "COMPLETED";
                instance.businessOutcome = (outcome != null && !outcome.isBlank()) ? outcome : "APPROVED";
            }
            instance.completedAt = Instant.now();
            instance.updatedAt = instance.completedAt;
            instances.save(instance);
            eventLogger.logEvent(instanceId, null, null, "INSTANCE_COMPLETED", "Workflow đã kết thúc",
                    "Status: " + instance.status + ", Outcome: " + instance.businessOutcome,
                    "SUCCESS", null, Map.of("status", instance.status, "businessOutcome", String.valueOf(instance.businessOutcome)));
            eventLogger.publishInstanceCompleted(instanceId, instance.status, instance.businessOutcome, instance.completedAt, instance.failureReason);
        }
    }

    @Transactional
    public Map<String, Object> cancel(String instanceId) {
        String actor = current.id();
        WorkflowInstanceEntity instance = instances.findById(instanceId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy instance " + instanceId));
        if (!actor.equals(instance.creatorId) && !permissions.has(actor, "INSTANCE_START", null)) {
            throw ApiException.forbidden("Thiếu quyền INSTANCE_START để hủy instance");
        }
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
        jobService.cancelPending(instanceId, now);
        instance.status = "CANCELLED";
        instance.businessOutcome = "CANCELLED";
        instance.completedAt = now;
        instance.updatedAt = now;
        instances.save(instance);
        eventLogger.logEvent(instanceId, null, null, "INSTANCE_CANCELLED", "Workflow đã bị hủy", "Hủy bởi " + actor,
                "CANCELLED",
                actor, Map.of());
        eventLogger.publishInstanceCompleted(instanceId, "CANCELLED", "CANCELLED", now, null);
        audit.append(actor, "CANCEL", "INSTANCE", instanceId, null, null, Map.of("status", "CANCELLED"), null);
        return Map.of("id", instanceId, "status", "CANCELLED");
    }

    private void cancelOpenForParticipant(String peId) {
        tasks.findByParticipantExecutionIdOrderByCreatedAtDesc(peId).stream().filter(t -> OPEN_TASK.contains(t.status))
                .forEach(t -> {
                    t.status = "CANCELLED";
                    t.completedAt = Instant.now();
                    tasks.save(t);
                });
    }

    private ObjectNode definition(String instanceId) {
        WorkflowInstanceEntity instance = instances.findById(instanceId).orElseThrow();
        return jsons.object(workflowVersions.findById(instance.workflowVersionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy version đã pin")).definitionSnapshot);
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
}
