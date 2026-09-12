package com.acme.workflow.runtime;

import com.acme.workflow.auth.*;
import com.acme.workflow.category.repository.TicketCategoryRepository;
import com.acme.workflow.common.*;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.repository.*;
import com.acme.workflow.runtime.domain.*;
import com.acme.workflow.runtime.repository.*;
import com.acme.workflow.ticket.repository.TicketRepository;
import com.acme.workflow.workflow.repository.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class RuntimeQueryService {
    private static final List<String> OPEN = List.of("PENDING", "CLAIMED", "IN_PROGRESS");
    private final WorkflowInstanceRepository instances;
    private final ParticipantExecutionRepository participants;
    private final NodeExecutionRepository executions;
    private final WorkflowTaskRepository tasks;
    private final TaskCandidateUserRepository candidates;
    private final EvaluationResultRepository evaluations;
    private final RuntimeEventRepository events;
    private final WorkflowDefinitionRepository workflows;
    private final WorkflowVersionRepository versions;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final Jsons jsons;
    private final RuntimeEngineService engine;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final TaskSubmissionRepository submissions;
    private final TicketRepository ticketRepository;
    private final TicketCategoryRepository ticketCategoryRepository;
    private final FormVersionRepository formVersionRepository;
    private final FormDefinitionRepository formDefinitionRepository;

    public RuntimeQueryService(WorkflowInstanceRepository instances, ParticipantExecutionRepository participants,
                               NodeExecutionRepository executions, WorkflowTaskRepository tasks,
                               TaskCandidateUserRepository candidates, EvaluationResultRepository evaluations,
                               RuntimeEventRepository events, WorkflowDefinitionRepository workflows,
                               WorkflowVersionRepository versions, HrmUserRepository users,
                               OrganizationUnitRepository organizations, Jsons jsons,
                               RuntimeEngineService engine, CurrentUserService current,
                               PermissionService permissions, TaskSubmissionRepository submissions,
                               TicketRepository ticketRepository, TicketCategoryRepository ticketCategoryRepository,
                               FormVersionRepository formVersionRepository, FormDefinitionRepository formDefinitionRepository) {
        this.instances = instances;
        this.participants = participants;
        this.executions = executions;
        this.tasks = tasks;
        this.candidates = candidates;
        this.evaluations = evaluations;
        this.events = events;
        this.workflows = workflows;
        this.versions = versions;
        this.users = users;
        this.organizations = organizations;
        this.jsons = jsons;
        this.engine = engine;
        this.current = current;
        this.permissions = permissions;
        this.submissions = submissions;
        this.ticketRepository = ticketRepository;
        this.ticketCategoryRepository = ticketCategoryRepository;
        this.formVersionRepository = formVersionRepository;
        this.formDefinitionRepository = formDefinitionRepository;
    }
    public List<Map<String,Object>>instances(String workflowId,String status,String search){String q=search==null?"":search.toLowerCase(Locale.ROOT);List<WorkflowInstanceEntity>source=workflowId==null||workflowId.isBlank()?instances.findAllByOrderByStartedAtDesc():instances.findByWorkflowIdOrderByStartedAtDesc(workflowId);return source.stream().filter(i->status==null||status.isBlank()||status.equals(i.status)).filter(i->q.isBlank()||i.requestCode.toLowerCase(Locale.ROOT).contains(q)||users.findById(i.creatorId).map(u->u.displayName.toLowerCase(Locale.ROOT).contains(q)).orElse(false)).map(this::summary).toList();}
    private Map<String,Object>summary(WorkflowInstanceEntity i){Map<String,Object>m=new LinkedHashMap<>();m.put("id",i.id);m.put("requestCode",i.requestCode);m.put("workflowId",i.workflowId);m.put("workflowName",workflows.findById(i.workflowId).map(w->w.name).orElse(i.workflowId));m.put("workflowVersion",versions.findById(i.workflowVersionId).map(v->v.versionNo).orElse("?"));m.put("creatorId",i.creatorId);m.put("creatorName",users.findById(i.creatorId).map(u->u.displayName).orElse(i.creatorId));m.put("status",i.status);m.put("startedAt",i.startedAt);m.put("completedAt",i.completedAt);List<WorkflowTaskEntity>active=tasks.findByInstanceIdOrderByCreatedAtAsc(i.id).stream().filter(t->OPEN.contains(t.status)).toList();m.put("currentStepLabels",active.stream().map(t->t.title).distinct().toList());m.put("activeAssignees",active.stream().flatMap(t->t.assigneeId==null?candidates.findByTaskId(t.id).stream().map(c->users.findById(c.userId).map(u->u.displayName).orElse(c.userId)):java.util.stream.Stream.of(users.findById(t.assigneeId).map(u->u.displayName).orElse(t.assigneeId))).filter(Objects::nonNull).distinct().toList());m.put("participantCount",participants.countByInstanceId(i.id));m.put("completedParticipantCount",participants.countByInstanceIdAndStatus(i.id,"COMPLETED"));m.put("slaStatus",tasks.countByInstanceIdAndStatusInAndDueAtBefore(i.id,OPEN,Instant.now())>0?"OVERDUE":"ON_TIME");m.put("period",jsons.read(i.variablesData).path("period").asText(null));return m;}
    public Map<String,Object>instance(String id){WorkflowInstanceEntity i=instances.findById(id).or(()->instances.findByRequestCode(id)).orElseThrow(()->ApiException.notFound("Không tìm thấy instance "+id));Map<String,Object>detail=new LinkedHashMap<>(summary(i));List<Map<String,Object>>participantMaps=participants.findByInstanceIdOrderByStartedAtAsc(i.id).stream().map(this::participantMap).toList();detail.put("participants",participantMaps);detail.put("timeline",timeline(i.id));detail.put("tasks",tasks.findByInstanceIdOrderByCreatedAtAsc(i.id).stream().map(this::taskSummary).toList());detail.put("nodeExecutions",executions.findByInstanceIdOrderByExecutionOrderAsc(i.id).stream().map(this::executionMap).toList());Map<String,Object>context=new LinkedHashMap<>();context.put("trigger",jsons.mapper().convertValue(jsons.read(i.triggerData),Object.class));context.put("variables",jsons.mapper().convertValue(jsons.read(i.variablesData),Object.class));Map<String,Object>peContexts=new LinkedHashMap<>();participants.findByInstanceIdOrderByStartedAtAsc(i.id).forEach(p->peContexts.put(p.id,jsons.mapper().convertValue(engine.context(i.id,p.id),Object.class)));context.put("participants",peContexts);detail.put("context",context);return detail;}
    private Map<String,Object>participantMap(ParticipantExecutionEntity p){Map<String,Object>m=new LinkedHashMap<>();var user=users.findById(p.userId).orElse(null);List<WorkflowTaskEntity>history=tasks.findByParticipantExecutionIdOrderByCreatedAtDesc(p.id);WorkflowTaskEntity latest=history.isEmpty()?null:history.getFirst();WorkflowTaskEntity active=history.stream().filter(t->OPEN.contains(t.status)).findFirst().orElse(null);m.put("id",p.id);m.put("userId",p.userId);m.put("displayName",user==null?p.userId:user.displayName);m.put("department",user==null?null:organizations.findById(user.organizationUnitId).map(o->o.name).orElse(null));m.put("status",p.status);m.put("currentNodeId",p.currentNodeId);m.put("currentStepLabel",latest==null?null:latest.title);m.put("currentAssignee",active==null?null:users.findById(active.assigneeId).map(u->u.displayName).orElse(active.assigneeId));m.put("iterationNo",p.iterationNo);m.put("startedAt",p.startedAt);m.put("completedAt",p.completedAt);return m;}
    public List<Map<String,Object>>tasks(String status,String workflowId,String assigneeId){
        String actor=current.id();
        String target=actor;
        if(assigneeId!=null&&!assigneeId.isBlank()&&permissions.has(actor,"TASK_MANAGE_ALL",null)){
            target=assigneeId;
        }
        final String filterUserId=target;
        List<WorkflowTaskEntity>source=tasks.findAllByOrderByCreatedAtDesc();
        return source.stream().filter(t->filterUserId.equals(t.assigneeId)||filterUserId.equals(t.claimantId)||candidates.existsByTaskIdAndUserId(t.id,filterUserId)).filter(t->status==null||status.isBlank()||status.equals(t.status)).filter(t->workflowId==null||workflowId.isBlank()||instances.findById(t.instanceId).map(i->workflowId.equals(i.workflowId)).orElse(false)).sorted(Comparator.comparing((WorkflowTaskEntity t)->OPEN.contains(t.status)?0:1).thenComparing(t->t.dueAt,Comparator.nullsLast(Comparator.naturalOrder()))).map(this::taskMap).toList();
    }
    private Map<String,Object>taskMap(WorkflowTaskEntity t){
        WorkflowInstanceEntity i = instances.findById(t.instanceId).orElseThrow();
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", t.id);
        m.put("workflowId", i.workflowId);
        m.put("workflowName", workflows.findById(i.workflowId).map(w -> w.name).orElse(i.workflowId));
        m.put("workflowInstanceId", i.id);
        m.put("requestCode", i.requestCode);
        m.put("nodeId", t.nodeId);
        m.put("taskType", t.taskType);
        m.put("title", t.title);
        m.put("description", t.description);
        Map<String,Object> assignee = new LinkedHashMap<>();
        assignee.put("id", t.assigneeId);
        assignee.put("displayName", t.assigneeId == null ? "Pool" : users.findById(t.assigneeId).map(u -> u.displayName).orElse(t.assigneeId));
        m.put("assignee", assignee);
        m.put("claimantId", t.claimantId);
        m.put("claimedAt", t.claimedAt);
        m.put("candidateUserIds", candidates.findByTaskId(t.id).stream().map(c -> c.userId).toList());
        ParticipantExecutionEntity pe = t.participantExecutionId == null ? null : participants.findById(t.participantExecutionId).orElse(null);
        m.put("participantId", pe == null ? null : pe.userId);
        m.put("participantName", pe == null ? null : users.findById(pe.userId).map(u -> u.displayName).orElse(pe.userId));
        var snap = jsons.read(t.resolutionSnapshot);
        if (snap.has("reviewedParticipantId")) {
            m.put("reviewedParticipantId", snap.path("reviewedParticipantId").asText());
            m.put("reviewedParticipantName", snap.path("reviewedParticipantName").asText(snap.path("reviewedParticipantId").asText()));
        }
        if (snap.has("reviewedSubmission")) {
            m.put("reviewedSubmission", jsons.mapper().convertValue(snap.path("reviewedSubmission"), Object.class));
        }

        // --- Enrich Ticket & External Form Data ---
        ticketRepository.findByWorkflowInstanceId(t.instanceId).ifPresentOrElse(ticket -> {
            m.put("ticketId", ticket.id);
            m.put("ticketCode", ticket.ticketCode);
            m.put("categoryId", ticket.categoryId);
            if (ticket.formData != null && !ticket.formData.isBlank()) {
                m.put("formData", jsons.mapper().convertValue(jsons.read(ticket.formData), Object.class));
            }
            Map<String, Object> init = new LinkedHashMap<>();
            init.put("userId", ticket.initiatorId);
            init.put("displayName", ticket.initiatorName != null ? ticket.initiatorName : ticket.initiatorId);
            init.put("departmentId", ticket.initiatorDepartmentId != null ? ticket.initiatorDepartmentId : "");
            users.findById(ticket.initiatorId).ifPresent(u -> {
                init.put("email", u.email);
                organizations.findById(u.organizationUnitId).ifPresent(o -> init.put("departmentName", o.name));
            });
            m.put("initiator", init);
            ticketCategoryRepository.findById(ticket.categoryId).ifPresent(cat -> m.put("categoryName", cat.name));
            formVersionRepository.findById(ticket.formVersionId).ifPresent(fv -> {
                m.put("formSchemaSnapshot", jsons.mapper().convertValue(jsons.read(fv.schemaSnapshot), Object.class));
                m.put("formVersionNumber", fv.versionNumber);
                formDefinitionRepository.findById(fv.formDefinitionId).ifPresent(fd -> m.put("formName", fd.name));
            });
        }, () -> {
            if (snap.has("ticketId")) {
                m.put("ticketId", snap.path("ticketId").asText());
            }
            if (snap.has("ticketCode")) {
                m.put("ticketCode", snap.path("ticketCode").asText());
            }
            if (snap.has("categoryId")) {
                String catId = snap.path("categoryId").asText();
                m.put("categoryId", catId);
                ticketCategoryRepository.findById(catId).ifPresent(cat -> m.put("categoryName", cat.name));
            }
            if (snap.has("formData")) {
                m.put("formData", jsons.mapper().convertValue(snap.get("formData"), Object.class));
            }
            if (snap.has("initiator")) {
                m.put("initiator", jsons.mapper().convertValue(snap.get("initiator"), Object.class));
            }
            if (snap.has("formVersionId")) {
                formVersionRepository.findById(snap.path("formVersionId").asText()).ifPresent(fv -> {
                    m.put("formSchemaSnapshot", jsons.mapper().convertValue(jsons.read(fv.schemaSnapshot), Object.class));
                    m.put("formVersionNumber", fv.versionNumber);
                    formDefinitionRepository.findById(fv.formDefinitionId).ifPresent(fd -> m.put("formName", fd.name));
                });
            }
        });

        // --- Approval History ---
        List<Map<String, Object>> approvalHistory = new ArrayList<>();
        List<WorkflowTaskEntity> instanceTasks = tasks.findByInstanceIdOrderByCreatedAtAsc(t.instanceId);
        for (WorkflowTaskEntity it : instanceTasks) {
            if ("COMPLETED".equals(it.status) || "REJECTED".equals(it.status)) {
                submissions.findByTaskId(it.id).forEach(sub -> {
                    Map<String, Object> h = new LinkedHashMap<>();
                    h.put("taskId", it.id);
                    h.put("taskTitle", it.title);
                    h.put("taskType", it.taskType);
                    h.put("actorId", sub.actorId);
                    h.put("actorName", users.findById(sub.actorId).map(u -> u.displayName).orElse(sub.actorId));
                    h.put("action", sub.action);
                    h.put("comment", sub.commentText);
                    h.put("createdAt", sub.createdAt);
                    approvalHistory.add(h);
                });
            }
        }
        m.put("approvalHistory", approvalHistory);

        m.put("status", t.status);
        m.put("priority", t.priority);
        m.put("dueAt", t.dueAt);
        m.put("formFields", jsons.mapper().convertValue(jsons.read(t.formSchema), Object.class));
        m.put("formSchema", jsons.mapper().convertValue(jsons.read(t.formSchema), Object.class));
        m.put("allowedActions", jsons.mapper().convertValue(jsons.read(t.allowedActions), Object.class));
        m.put("executionScope", "EACH_PARTICIPANT");
        m.put("completionPolicy", jsons.mapper().convertValue(jsons.read(t.resolutionSnapshot).path("completionPolicy"), Object.class));
        m.put("createdAt", t.createdAt);
        m.put("createdBy", "system");
        return m;
    }
    private Map<String,Object>taskSummary(WorkflowTaskEntity t){Map<String,Object>m=new LinkedHashMap<>();m.put("id",t.id);m.put("title",t.title);m.put("assignee",t.assigneeId==null?"Pool":users.findById(t.assigneeId).map(u->u.displayName).orElse(t.assigneeId));m.put("candidateUserIds",candidates.findByTaskId(t.id).stream().map(c->c.userId).toList());m.put("status",t.status);m.put("dueAt",t.dueAt);ParticipantExecutionEntity participant=t.participantExecutionId==null?null:participants.findById(t.participantExecutionId).orElse(null);m.put("participantExecutionId",t.participantExecutionId);m.put("participantId",participant==null?null:participant.userId);return m;}
    private List<Map<String, Object>> timeline(String id) {
        List<RuntimeEventEntity> eventList = events.findTimelineEvents(id);
        List<NodeExecutionEntity> nodeExecList = executions.findByInstanceIdOrderByExecutionOrderAsc(id);
        List<WorkflowTaskEntity> taskList = tasks.findByInstanceIdOrderByCreatedAtAsc(id);
        Map<String, WorkflowTaskEntity> taskMap = new HashMap<>();
        taskList.forEach(t -> taskMap.put(t.id, t));

        // Map nodeExecutionId -> step info
        Map<String, Map<String, Object>> stepInfoMap = new HashMap<>();
        int stepCounter = 1;
        for (NodeExecutionEntity ne : nodeExecList) {
            String stepName = switch (ne.nodeType) {
                case "START" -> "Bắt đầu";
                case "END" -> "Kết thúc";
                case "FORM" -> "Biểu mẫu / Khảo sát";
                case "APPROVAL" -> "Phê duyệt";
                case "REVIEW" -> "Xem xét / Đánh giá";
                case "ASSIGNMENT" -> "Phân công / Thêm người";
                case "NOTIFICATION" -> "Gửi thông báo";
                case "CONDITION" -> "Điều kiện rẽ nhánh";
                case "SYSTEM" -> "Hệ thống tự động";
                default -> ne.nodeType;
            };
            Map<String, Object> info = new HashMap<>();
            info.put("stepNo", stepCounter++);
            info.put("stepName", stepName);
            info.put("nodeType", ne.nodeType);
            info.put("nodeId", ne.nodeId);
            info.put("state", ne.state);
            stepInfoMap.put(ne.id, info);
        }

        for (RuntimeEventEntity e : eventList) {
            if (e.nodeExecutionId != null && stepInfoMap.containsKey(e.nodeExecutionId)) {
                if ("NODE_STARTED".equals(e.eventType) && e.title != null && !e.title.isBlank()) {
                    stepInfoMap.get(e.nodeExecutionId).put("stepName", e.title);
                }
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (RuntimeEventEntity e : eventList) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.id);
            m.put("time", e.createdAt);
            m.put("timestamp", e.createdAt);
            m.put("title", e.title);
            m.put("description", e.description);
            m.put("eventType", e.eventType);

            int stepNo = 1;
            String stepName = "Khởi tạo quy trình";
            String nodeType = "TRIGGER";
            String nodeId = null;

            if (e.nodeExecutionId != null && stepInfoMap.containsKey(e.nodeExecutionId)) {
                Map<String, Object> sInfo = stepInfoMap.get(e.nodeExecutionId);
                stepNo = (int) sInfo.get("stepNo");
                stepName = (String) sInfo.get("stepName");
                nodeType = (String) sInfo.get("nodeType");
                nodeId = (String) sInfo.get("nodeId");
            } else if ("INSTANCE_COMPLETED".equals(e.eventType) || "INSTANCE_CANCELLED".equals(e.eventType)) {
                stepNo = Math.max(stepCounter, 2);
                stepName = "Kết thúc quy trình";
                nodeType = "END";
            }
            m.put("stepNo", stepNo);
            m.put("stepName", stepName);
            m.put("nodeType", nodeType);
            m.put("nodeId", nodeId);

            if (e.actorId != null && !e.actorId.isBlank()) {
                m.put("actorId", e.actorId);
                m.put("actorName", users.findById(e.actorId).map(u -> u.displayName).orElse(e.actorId));
            } else {
                m.put("actorName", "Hệ thống");
            }

            String state = "completed";
            String slaText = null;

            if ("EXECUTION_FAILED".equals(e.eventType) || "INSTANCE_CANCELLED".equals(e.eventType) || "TASK_REJECTED".equals(e.eventType)) {
                state = "failed";
            } else if ("TASK_ASSIGNED".equals(e.eventType) || "TASK_CLAIMED".equals(e.eventType) || "TASK_VOTE_RECORDED".equals(e.eventType)) {
                String taskId = null;
                if (e.eventData != null && e.eventData.contains("\"taskId\"")) {
                    try {
                        taskId = jsons.read(e.eventData).path("taskId").asText(null);
                    } catch (Exception ignored) {}
                }
                WorkflowTaskEntity relatedTask = taskId != null ? taskMap.get(taskId) : null;
                if (relatedTask != null && OPEN.contains(relatedTask.status)) {
                    state = "waiting";
                    if (relatedTask.dueAt != null) {
                        if (relatedTask.dueAt.isBefore(Instant.now())) {
                            slaText = "Quá hạn " + formatDuration(Instant.now(), relatedTask.dueAt);
                        } else {
                            slaText = "SLA: Còn " + formatDuration(relatedTask.dueAt, Instant.now());
                        }
                    }
                } else {
                    state = "completed";
                }
            } else if ("NODE_STARTED".equals(e.eventType) || "NODE_WAITING".equals(e.eventType)) {
                if (e.nodeExecutionId != null && stepInfoMap.containsKey(e.nodeExecutionId)) {
                    String execState = (String) stepInfoMap.get(e.nodeExecutionId).get("state");
                    state = "COMPLETED".equals(execState) ? "completed" : "running";
                } else {
                    state = "completed";
                }
            } else {
                state = "completed";
            }

            m.put("state", state);
            m.put("status", e.eventStatus);
            m.put("slaText", slaText);
            m.put("participantId", e.participantExecutionId);
            result.add(m);
        }
        return result;
    }

    private String formatDuration(Instant later, Instant earlier) {
        long seconds = java.time.Duration.between(earlier, later).abs().getSeconds();
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        if (hours > 24) {
            long days = hours / 24;
            return days + " ngày " + (hours % 24) + " giờ";
        }
        if (hours > 0) {
            return hours + " giờ " + minutes + " phút";
        }
        return Math.max(1, minutes) + " phút";
    }
    private Map<String,Object>executionMap(NodeExecutionEntity e){Map<String,Object>m=new LinkedHashMap<>();m.put("id",e.id);m.put("nodeId",e.nodeId);m.put("nodeType",e.nodeType);m.put("executionOrder",e.executionOrder);m.put("participantId",e.participantExecutionId);m.put("iterationNo",e.iterationNo);m.put("state",e.state);m.put("outcomePort",e.outcomePort);m.put("output",jsons.mapper().convertValue(jsons.read(e.outputData),Object.class));m.put("startedAt",e.startedAt);m.put("completedAt",e.completedAt);return m;}
    public List<Map<String,Object>>evaluations(String period,String participantId){List<EvaluationResultEntity>source=period!=null&&!period.isBlank()&&participantId!=null&&!participantId.isBlank()?evaluations.findByPeriodKeyAndParticipantUserId(period,participantId):period!=null&&!period.isBlank()?evaluations.findByPeriodKey(period):participantId!=null&&!participantId.isBlank()?evaluations.findByParticipantUserId(participantId):evaluations.findAll();return source.stream().sorted(Comparator.comparing((EvaluationResultEntity e)->e.createdAt).reversed()).map(e->{Map<String,Object>m=new LinkedHashMap<>();m.put("id",e.id);m.put("instanceId",e.instanceId);m.put("participantUserId",e.participantUserId);m.put("participantName",users.findById(e.participantUserId).map(u->u.displayName).orElse(e.participantUserId));m.put("period",e.periodKey);m.put("selfScore",e.selfScore);m.put("managerScore",e.managerScore);m.put("managerCompetency",e.managerCompetency);m.put("evaluationValid",e.evaluationValid);m.put("status",e.status);m.put("createdAt",e.createdAt);return m;}).toList();}
}
