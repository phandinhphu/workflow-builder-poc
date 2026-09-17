package com.acme.workflow.runtime.task;

import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.runtime.domain.NodeExecutionEntity;
import com.acme.workflow.runtime.domain.TaskSubmissionEntity;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.acme.workflow.runtime.event.RuntimeEventLogger;
import com.acme.workflow.runtime.notification.RuntimeNotificationService;
import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.acme.workflow.runtime.repository.ParticipantExecutionRepository;
import com.acme.workflow.runtime.repository.TaskCandidateUserRepository;
import com.acme.workflow.runtime.repository.TaskSubmissionRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.runtime.repository.WorkflowTaskRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class TaskActionService {

    private static final Set<String> OPEN_TASK = Set.of("PENDING", "CLAIMED", "IN_PROGRESS");

    private final WorkflowTaskRepository tasks;
    private final TaskSubmissionRepository submissions;
    private final TaskCandidateUserRepository candidates;
    private final NodeExecutionRepository executions;
    private final ParticipantExecutionRepository participants;
    private final WorkflowInstanceRepository instances;
    private final HrmUserRepository users;
    private final DirectoryService directory;
    private final FormSchemaService formSchemaService;
    private final TaskCompletionEvaluator completionEvaluator;
    private final RuntimeNotificationService notificationService;
    private final RuntimeEventLogger eventLogger;
    private final AuditService audit;
    private final PermissionService permissions;
    private final Jsons jsons;

    public TaskActionService(WorkflowTaskRepository tasks,
                             TaskSubmissionRepository submissions,
                             TaskCandidateUserRepository candidates,
                             NodeExecutionRepository executions,
                             ParticipantExecutionRepository participants,
                             WorkflowInstanceRepository instances,
                             HrmUserRepository users,
                             DirectoryService directory,
                             FormSchemaService formSchemaService,
                             TaskCompletionEvaluator completionEvaluator,
                             RuntimeNotificationService notificationService,
                             RuntimeEventLogger eventLogger,
                             AuditService audit,
                             PermissionService permissions,
                             Jsons jsons) {
        this.tasks = tasks;
        this.submissions = submissions;
        this.candidates = candidates;
        this.executions = executions;
        this.participants = participants;
        this.instances = instances;
        this.users = users;
        this.directory = directory;
        this.formSchemaService = formSchemaService;
        this.completionEvaluator = completionEvaluator;
        this.notificationService = notificationService;
        this.eventLogger = eventLogger;
        this.audit = audit;
        this.permissions = permissions;
        this.jsons = jsons;
    }

    public Map<String, Object> claim(String taskId, String actor) {
        WorkflowTaskEntity task = lockedTask(taskId);
        ensureActor(actor, task);
        if (!"PENDING".equals(task.status))
            throw ApiException.badRequest("TASK_NOT_CLAIMABLE", "Task không còn PENDING");
        task.status = "CLAIMED";
        task.claimantId = actor;
        task.claimedAt = Instant.now();
        tasks.saveAndFlush(task);
        String actorName = users.findById(actor).map(u -> u.displayName).orElse(actor);
        eventLogger.logEvent(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_CLAIMED", "Task đã được nhận",
                actorName + " đã nhận xử lý task '" + task.title + "'", "RUNNING", actor, Map.of("taskId", task.id, "taskTitle", task.title));
        return Map.of("success", true, "taskId", taskId, "claimedBy", actor, "message", "Task claimed successfully");
    }

    public TaskActionResult processAction(String taskId, String action, ObjectNode request, String actor) {
        log.info("Đang xử lý task: {}", taskId);
        log.info("Cho người dùng: {}", actor);
        log.info("Action: {}", action);
        log.info("Request: {}", request);

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
        String comment = request.path("comment").asText(null);
        if (comment != null)
            comment = comment.trim();
        if (comment != null && comment.isBlank())
            comment = null;
        if ("REJECT".equals(normalized) && "APPROVAL".equalsIgnoreCase(task.taskType) && comment == null)
            throw ApiException.badRequest("REJECTION_REASON_REQUIRED", "Vui lòng nhập lý do từ chối phê duyệt");

        ArrayNode fields = (ArrayNode) jsons.read(task.formSchema);
        JsonNode data = request.has("data") ? request.path("data") : request;
        ObjectNode output = formSchemaService.normalizeSubmission(fields, data);
        if ("COMPLETE".equals(normalized))
            formSchemaService.validateSubmission(fields, output);

        TaskSubmissionEntity submission = new TaskSubmissionEntity();
        submission.id = Ids.uuid();
        submission.taskId = task.id;
        submission.revisionNo = (int) submissions.countByTaskId(task.id) + 1;
        submission.action = normalized;
        submission.actorId = actor;
        submission.formData = jsons.write(output);
        submission.commentText = comment;
        submission.createdAt = Instant.now();
        submissions.save(submission);

        task.status = "COMPLETE".equals(normalized) ? "COMPLETED"
                : "REJECT".equals(normalized) ? "REJECTED" : "REQUEST_CHANGE";
        task.completedAt = Instant.now();
        tasks.saveAndFlush(task);

        String actorName = users.findById(actor).map(u -> u.displayName).orElse(actor);
        if ("REJECT".equals(normalized) && "APPROVAL".equalsIgnoreCase(task.taskType)) {
            String recipientId = resolution.path("reviewedParticipantId").asText(null);
            if (recipientId == null && task.participantExecutionId != null) {
                recipientId = participants.findById(task.participantExecutionId).map(p -> p.userId).orElse(null);
            }
            if (recipientId == null) {
                recipientId = instances.findById(task.instanceId).map(i -> i.creatorId).orElse(null);
            }
            notificationService.sendApprovalRejectionNotification(task, resolution, actorName, comment, recipientId);
        }

        NodeExecutionEntity execution = executions.findById(task.nodeExecutionId).orElseThrow();
        String port = outcome(execution.nodeType, normalized);
        boolean isPerParticipantTask = jsons.object(task.resolutionSnapshot).has("reviewedParticipantId");
        boolean routeNow;
        if (isPerParticipantTask) {
            List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(task.nodeExecutionId);
            routeNow = siblings.stream().allMatch(t -> !OPEN_TASK.contains(t.status));
            if (routeNow) {
                boolean anyRejected = siblings.stream().anyMatch(t -> "REJECTED".equals(t.status));
                port = anyRejected ? "REJECTED" : "APPROVED";
            }
        } else {
            List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(task.nodeExecutionId);
            routeNow = !"COMPLETE".equals(normalized) || completionEvaluator.isCompletionReached(siblings, resolution);
        }

        String actionDesc = "COMPLETE".equals(normalized) ? "Đã hoàn thành" : "REJECT".equals(normalized) ? "Đã từ chối" : "Đã yêu cầu chỉnh sửa";
        ObjectNode finalOutput = output;
        if (routeNow) {
            log.info("1. Task is routed now...");
            cancelSiblingTasks(task);
            log.info("2. Cancelled sibling tasks...");
            finalOutput = aggregateTaskOutputs(execution, output, port, normalized, comment, actor);
            log.info("3. Aggregated outputs...");
            eventLogger.logEvent(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_" + task.status,
                    actionDesc + " task", actorName + " " + actionDesc.toLowerCase(Locale.ROOT) + " task '" + task.title + "'", "SUCCESS", actor, finalOutput);
        } else {
            log.info("waiting for completion policy...");
            eventLogger.logEvent(task.instanceId, task.participantExecutionId, task.nodeExecutionId, "TASK_VOTE_RECORDED",
                    "Đã ghi nhận kết quả", actorName + " " + actionDesc.toLowerCase(Locale.ROOT) + " task '" + task.title + "' (đang chờ các lượt xử lý khác)", "WAITING", actor, output);
        }

        audit.append(actor, normalized, "TASK", task.id, null, null, output,
                Map.of("outcomePort", port, "routed", routeNow));

        return new TaskActionResult(true, task.id, task.status, port, routeNow, finalOutput, actionDesc);
    }

    public ObjectNode aggregateTaskOutputs(NodeExecutionEntity execution, ObjectNode currentTaskOutput,
                                          String port, String action, String comment, String actor) {
        ObjectNode result = currentTaskOutput.deepCopy();
        // Set built-in fields for Approval nodes
        if ("APPROVAL".equalsIgnoreCase(execution.nodeType)) {
            result.put("outcome", port);
            result.put("approved", "APPROVED".equalsIgnoreCase(port));
            result.put("action", action);
            if (comment != null && !comment.isBlank())
                result.put("comment", comment);
            result.put("approverId", actor);

            List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(execution.id);
            if (!siblings.isEmpty()) {
                ArrayNode approvalList = jsons.mapper().createArrayNode();
                for (WorkflowTaskEntity sibling : siblings) {
                    submissions.findTopByTaskIdOrderByRevisionNoDesc(sibling.id).ifPresent(sub -> {
                        ObjectNode entry = jsons.object();
                        entry.put("taskId", sibling.id);
                        entry.put("approverId", sub.actorId);
                        entry.put("action", sub.action);
                        entry.put("comment", sub.commentText);
                        entry.put("completedAt", sub.createdAt.toString());
                        ObjectNode snap = jsons.object(sibling.resolutionSnapshot);
                        if (snap.has("reviewedParticipantId")) {
                            entry.put("reviewedParticipantId", snap.path("reviewedParticipantId").asText());
                        }
                        approvalList.add(entry);
                    });
                }
                result.set("approvalList", approvalList);
            }
            return result;
        }

        // Set built-in fields for Review nodes
        if ("REVIEW".equalsIgnoreCase(execution.nodeType)) {
            result.put("outcome", port);
            result.put("reviewed", "REVIEW_COMPLETED".equalsIgnoreCase(port));
            result.put("action", action);
            if (comment != null && !comment.isBlank())
                result.put("comment", comment);
            result.put("reviewerId", actor);

            List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(execution.id);
            if (!siblings.isEmpty()) {
                ArrayNode reviewList = jsons.mapper().createArrayNode();
                for (WorkflowTaskEntity sibling : siblings) {
                    submissions.findTopByTaskIdOrderByRevisionNoDesc(sibling.id).ifPresent(sub -> {
                        ObjectNode entry = jsons.object();
                        entry.put("taskId", sibling.id);
                        entry.put("reviewerId", sub.actorId);
                        entry.put("action", sub.action);
                        entry.put("comment", sub.commentText);
                        entry.put("completedAt", sub.createdAt.toString());
                        ObjectNode snap = jsons.object(sibling.resolutionSnapshot);
                        if (snap.has("reviewedParticipantId")) {
                            entry.put("reviewedParticipantId", snap.path("reviewedParticipantId").asText());
                        }
                        reviewList.add(entry);
                    });
                }
                result.set("reviewList", reviewList);
            }
            return result;
        }

        if ("ASSIGNMENT".equalsIgnoreCase(execution.nodeType)) {
            ArrayNode participantIds = jsons.mapper().createArrayNode();
            ArrayNode participantsList = jsons.mapper().createArrayNode();
            JsonNode rawIds = currentTaskOutput.has("participantUserIds") ? currentTaskOutput.get("participantUserIds")
                    : currentTaskOutput.has("participantIds") ? currentTaskOutput.get("participantIds") : null;
            if (rawIds != null && rawIds.isArray()) {
                rawIds.forEach(idNode -> {
                    String uid = idNode.isObject() && idNode.has("id") ? idNode.get("id").asText() : idNode.asText();
                    if (!uid.isBlank()) {
                        participantIds.add(uid);
                        try {
                            participantsList.add(jsons.value(directory.user(uid)));
                        } catch (Exception ignored) {
                            participantsList.add(jsons.object().put("id", uid));
                        }
                    }
                });
            }
            result.set("participantIds", participantIds);
            result.set("participants", participantsList);
            result.put("totalParticipants", participantIds.size());
            return result;
        }

        List<WorkflowTaskEntity> siblings = tasks.findByNodeExecutionIdOrderByCreatedAtAsc(execution.id);
        if (!siblings.isEmpty()) {
            ObjectNode submissionsMap = jsons.object();
            ArrayNode submissionList = jsons.mapper().createArrayNode();
            for (WorkflowTaskEntity sibling : siblings) {
                if ("COMPLETED".equals(sibling.status)) {
                    submissions.findTopByTaskIdOrderByRevisionNoDesc(sibling.id).ifPresent(sub -> {
                        JsonNode formData = jsons.read(sub.formData);
                        String uid = sibling.assigneeId != null ? sibling.assigneeId : sibling.claimantId;
                        if (uid != null) {
                            submissionsMap.set(uid, formData);
                        }
                        ObjectNode entry = jsons.object();
                        entry.put("taskId", sibling.id);
                        entry.put("userId", uid);
                        try {
                            if (uid != null) {
                                entry.set("user", jsons.value(directory.user(uid)));
                            }
                        } catch (Exception ignored) {
                        }
                        entry.set("data", formData);
                        entry.put("action", sub.action);
                        entry.put("submittedAt", sub.createdAt.toString());
                        submissionList.add(entry);
                    });
                }
            }
            result.set("submissions", submissionsMap);
            result.set("submissionList", submissionList);
            result.put("totalSubmissions", submissionList.size());
        }
        return result;
    }

    public void cancelSiblingTasks(WorkflowTaskEntity currentTask) {
        ObjectNode snap = jsons.object(currentTask.resolutionSnapshot);
        if (snap.has("reviewedParticipantId")) {
            return;
        }
        tasks.findByNodeExecutionIdOrderByCreatedAtAsc(currentTask.nodeExecutionId).stream()
                .filter(t -> !t.id.equals(currentTask.id) && OPEN_TASK.contains(t.status)).forEach(t -> {
                    t.status = "CANCELLED";
                    t.completedAt = Instant.now();
                    tasks.save(t);
                });
    }

    public String outcome(String type, String action) {
        if ("REJECT".equals(action))
            return "REJECTED";
        if ("REQUEST_CHANGE".equals(action))
            return "REQUEST_CHANGE";
        return switch (type) {
            case "APPROVAL" -> "APPROVED";
            case "REVIEW" -> "REVIEW_COMPLETED";
            default -> "SUCCESS";
        };
    }

    public WorkflowTaskEntity lockedTask(String id) {
        return tasks.findLockedById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy task " + id));
    }

    public void ensureActor(String actor, WorkflowTaskEntity task) {
        if (actor.equals(task.assigneeId) || actor.equals(task.claimantId)
                || candidates.existsByTaskIdAndUserId(task.id, actor)
                || permissions.has(actor, "TASK_MANAGE_ALL", null))
            return;
        throw ApiException.forbidden("Task không được giao cho người dùng hiện tại");
    }
}
