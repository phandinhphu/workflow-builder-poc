package com.acme.workflow.ticket;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.category.domain.TicketCategoryEntity;
import com.acme.workflow.category.repository.TicketCategoryRepository;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.domain.HrmUser;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.runtime.RuntimeEngineService;
import com.acme.workflow.runtime.domain.NodeExecutionEntity;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.runtime.repository.WorkflowTaskRepository;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.acme.workflow.ticket.domain.TicketEntity;
import com.acme.workflow.ticket.dto.*;
import com.acme.workflow.ticket.repository.TicketRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketCategoryRepository categoryRepository;
    private final FormVersionRepository formVersionRepository;
    private final FormDefinitionRepository formDefinitionRepository;
    private final RuntimeEngineService runtimeEngineService;
    private final NodeExecutionRepository nodeExecutionRepository;
    private final WorkflowTaskRepository workflowTaskRepository;
    private final WorkflowInstanceRepository workflowInstanceRepository;
    private final WorkflowVersionRepository workflowVersionRepository;
    private final HrmUserRepository userRepository;
    private final OrganizationUnitRepository orgRepository;
    private final CurrentUserService currentUserService;
    private final PermissionService permissionService;
    private final AuditService auditService;
    private final FormSubmissionValidator formValidator;
    private final Jsons jsons;

    public TicketService(TicketRepository ticketRepository,
            TicketCategoryRepository categoryRepository,
            FormVersionRepository formVersionRepository,
            FormDefinitionRepository formDefinitionRepository,
            RuntimeEngineService runtimeEngineService,
            NodeExecutionRepository nodeExecutionRepository,
            WorkflowTaskRepository workflowTaskRepository,
            WorkflowInstanceRepository workflowInstanceRepository,
            WorkflowVersionRepository workflowVersionRepository,
            HrmUserRepository userRepository,
            OrganizationUnitRepository orgRepository,
            CurrentUserService currentUserService,
            PermissionService permissionService,
            AuditService auditService,
            FormSubmissionValidator formValidator,
            Jsons jsons) {
        this.ticketRepository = ticketRepository;
        this.categoryRepository = categoryRepository;
        this.formVersionRepository = formVersionRepository;
        this.formDefinitionRepository = formDefinitionRepository;
        this.runtimeEngineService = runtimeEngineService;
        this.nodeExecutionRepository = nodeExecutionRepository;
        this.workflowTaskRepository = workflowTaskRepository;
        this.workflowInstanceRepository = workflowInstanceRepository;
        this.workflowVersionRepository = workflowVersionRepository;
        this.userRepository = userRepository;
        this.orgRepository = orgRepository;
        this.currentUserService = currentUserService;
        this.permissionService = permissionService;
        this.auditService = auditService;
        this.formValidator = formValidator;
        this.jsons = jsons;
    }

    private void requireCreate(String actor) {
        if (!permissionService.has(actor, "TICKET_CREATE", null)
                && !canManageAll(actor)
                && !permissionService.has(actor, "WORKFLOW_EDIT", null)) {
            throw ApiException.forbidden("Thiếu quyền TICKET_CREATE để tạo yêu cầu");
        }
    }

    private void requireView(String actor) {
        if (!permissionService.has(actor, "TICKET_VIEW", null)
                && !canManageAll(actor)) {
            throw ApiException.forbidden("Thiếu quyền TICKET_VIEW để xem danh sách vé");
        }
    }

    private boolean canManageAll(String actor) {
        return permissionService.has(actor, "TICKET_MANAGE", null)
                || permissionService.has(actor, "ADMIN", null);
    }

    @SuppressWarnings("deprecation")
    @Transactional
    public TicketDetailResponse createTicket(CreateTicketRequest req) {
        String actor = currentUserService.id();
        requireCreate(actor);

        if (req.categoryId == null || req.categoryId.isBlank()) {
            throw ApiException.badRequest("CATEGORY_REQUIRED", "Vui lòng chọn danh mục yêu cầu");
        }

        TicketCategoryEntity category = categoryRepository.findByIdAndDeletedAtIsNull(req.categoryId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục yêu cầu: " + req.categoryId));

        if (!category.isActive) {
            throw ApiException.badRequest("CATEGORY_INACTIVE", "Danh mục này hiện đang tạm ngưng tiếp nhận yêu cầu");
        }

        FormVersionEntity formVersion = formVersionRepository.findById(category.formVersionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy phiên bản biểu mẫu gắn với danh mục"));

        // Validate form data against FormVersion schema snapshot
        JsonNode schemaSnapshot = jsons.read(formVersion.schemaSnapshot);
        formValidator.validate(schemaSnapshot, req.formData);

        HrmUser user = userRepository.findById(actor)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy thông tin người dùng: " + actor));

        String ticketCode = generateTicketCode();

        TicketEntity ticket = new TicketEntity();
        ticket.id = Ids.uuid();
        ticket.ticketCode = ticketCode;
        ticket.categoryId = category.id;
        ticket.formVersionId = formVersion.id;
        ticket.initiatorId = user.id;
        ticket.initiatorName = user.displayName;
        ticket.initiatorDepartmentId = user.organizationUnitId;
        ticket.formData = jsons.write(req.formData);
        ticket.status = "SUBMITTED";
        ticket.currentStepName = "Gửi yêu cầu";
        ticket.createdAt = Instant.now();
        ticket.updatedAt = ticket.createdAt;
        ticketRepository.saveAndFlush(ticket);

        // Apply field mapping if present
        ObjectNode variables = jsons.object();
        if (category.fieldMapping != null && !category.fieldMapping.isBlank()) {
            JsonNode mapping = jsons.read(category.fieldMapping);
            if (mapping.isObject()) {
                mapping.fields().forEachRemaining(entry -> {
                    String wfField = entry.getKey();
                    String formField = entry.getValue().asText();
                    if (req.formData.has(formField)) {
                        variables.set(wfField, req.formData.get(formField));
                    }
                });
            }
        }

        // Prepare context data for Workflow Engine
        ObjectNode contextData = jsons.object();
        contextData.put("ticketId", ticket.id);
        contextData.put("ticketCode", ticket.ticketCode);
        contextData.put("categoryId", category.id);
        contextData.put("formVersionId", formVersion.id);
        contextData.set("formData", req.formData);

        ObjectNode initiatorNode = jsons.object();
        initiatorNode.put("userId", user.id);
        initiatorNode.put("displayName", user.displayName);
        initiatorNode.put("departmentId", user.organizationUnitId != null ? user.organizationUnitId : "");
        initiatorNode.put("managerId", user.managerId != null ? user.managerId : "");
        contextData.set("initiator", initiatorNode);

        ObjectNode startRequest = jsons.object();
        startRequest.put("requestCode", ticket.ticketCode);
        startRequest.put("actorId", user.id);
        startRequest.set("variables", variables);
        startRequest.set("triggerData", jsons.object()
                .put("ticketId", ticket.id)
                .put("ticketCode", ticket.ticketCode)
                .put("categoryId", category.id)
                .set("formData", req.formData));
        startRequest.set("contextData", contextData);

        try {
            Map<String, Object> runResult = runtimeEngineService.startWithExecutable(
                    category.workflowExecutableId, startRequest, user.id);
            String actualInstanceId = (String) runResult.get("id");
            if (actualInstanceId != null) {
                ticket.workflowInstanceId = actualInstanceId;
            }

            // Sync with final or current status in case workflow finished or moved
            // synchronously
            workflowInstanceRepository.findById(ticket.workflowInstanceId).ifPresent(instance -> {
                if ("COMPLETED".equalsIgnoreCase(instance.status)) {
                    String outcome = instance.businessOutcome != null ? instance.businessOutcome.toUpperCase() : "APPROVED";
                    if ("REJECTED".equalsIgnoreCase(outcome)) {
                        ticket.status = "REJECTED";
                        ticket.currentStepName = "Từ chối";
                    } else if ("PAID".equalsIgnoreCase(outcome) || "DISBURSED".equalsIgnoreCase(outcome)) {
                        ticket.status = "PAID";
                        ticket.currentStepName = "Đã giải ngân";
                    } else if ("AUTO_APPROVED".equalsIgnoreCase(outcome)) {
                        ticket.status = "APPROVED";
                        ticket.currentStepName = "Tự động phê duyệt";
                    } else if ("COMPLETED".equalsIgnoreCase(outcome) || "RESOLVED".equalsIgnoreCase(outcome)) {
                        ticket.status = "COMPLETED";
                        ticket.currentStepName = "Hoàn tất";
                    } else {
                        ticket.status = "APPROVED";
                        ticket.currentStepName = "Hoàn tất";
                    }
                    ticket.resolvedAt = instance.completedAt != null ? instance.completedAt : Instant.now();
                } else if ("FAILED".equalsIgnoreCase(instance.status)) {
                    ticket.status = "PROCESSING_ERROR";
                    ticket.currentStepName = "Lỗi xử lý hệ thống";
                    ticket.resolvedAt = instance.completedAt != null ? instance.completedAt : Instant.now();
                } else if ("CANCELLED".equalsIgnoreCase(instance.status)) {
                    ticket.status = "CANCELLED";
                    ticket.currentStepName = "Đã hủy";
                    ticket.resolvedAt = instance.completedAt != null ? instance.completedAt : Instant.now();
                } else if ("RUNNING".equalsIgnoreCase(instance.status) && "SUBMITTED".equals(ticket.status)) {
                    List<WorkflowTaskEntity> activeTasks = workflowTaskRepository
                            .findByInstanceIdOrderByCreatedAtAsc(instance.id)
                            .stream().filter(t -> "PENDING".equals(t.status) || "CLAIMED".equals(t.status)).toList();
                    if (!activeTasks.isEmpty()) {
                        ticket.status = "IN_REVIEW";
                        ticket.currentStepName = activeTasks.get(0).title;
                    }
                }
            });
            ticketRepository.saveAndFlush(ticket);
        } catch (Exception e) {
            log.error("Failed to start workflow instance for ticket {}", ticket.ticketCode, e);
            ticket.status = "FAILED";
            ticketRepository.saveAndFlush(ticket);
            throw ApiException.internal("Không thể khởi động quy trình xử lý cho yêu cầu: " + e.getMessage());
        }

        auditService.append(actor, "CREATE", "TICKET", ticket.id, null, null,
                Map.of("ticketCode", ticket.ticketCode, "categoryId", category.id), null);

        return toDetailResponse(ticket, category, formVersion);
    }

    public List<TicketSummaryResponse> getMyTickets(String query, String status, String categoryId) {
        String actor = currentUserService.id();
        requireView(actor);

        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;
        String cleanStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim()
                : null;
        String cleanCat = (categoryId != null && !categoryId.isBlank() && !"ALL".equalsIgnoreCase(categoryId))
                ? categoryId.trim()
                : null;

        List<TicketEntity> list = ticketRepository.searchTickets(actor, cleanStatus, cleanCat, cleanQuery);
        return list.stream().map(this::toSummaryResponse).toList();
    }

    public List<TicketSummaryResponse> getAllTickets(String query, String status, String categoryId) {
        String actor = currentUserService.id();
        if (!canManageAll(actor)) {
            throw ApiException.forbidden("Thiếu quyền TICKET_MANAGE để xem toàn bộ danh sách vé");
        }

        String cleanQuery = (query != null && !query.isBlank()) ? query.trim() : null;
        String cleanStatus = (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) ? status.trim()
                : null;
        String cleanCat = (categoryId != null && !categoryId.isBlank() && !"ALL".equalsIgnoreCase(categoryId))
                ? categoryId.trim()
                : null;

        List<TicketEntity> list = ticketRepository.searchTickets(null, cleanStatus, cleanCat, cleanQuery);
        return list.stream().map(this::toSummaryResponse).toList();
    }

    public TicketDetailResponse getTicket(String id) {
        String actor = currentUserService.id();
        requireView(actor);

        TicketEntity ticket = ticketRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu: " + id));

        if (!canManageAll(actor) && !actor.equals(ticket.initiatorId)) {
            throw ApiException.forbidden("Bạn không có quyền xem yêu cầu này");
        }

        TicketCategoryEntity category = categoryRepository.findById(ticket.categoryId).orElse(null);
        FormVersionEntity formVersion = formVersionRepository.findById(ticket.formVersionId).orElse(null);

        return toDetailResponse(ticket, category, formVersion);
    }

    @Transactional
    public TicketDetailResponse cancelTicket(String id) {
        String actor = currentUserService.id();
        requireView(actor);

        TicketEntity ticket = ticketRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy yêu cầu: " + id));

        if (!canManageAll(actor) && !actor.equals(ticket.initiatorId)) {
            throw ApiException.forbidden("Bạn chỉ có thể hủy yêu cầu do chính mình tạo");
        }

        if (Set.of("APPROVED", "REJECTED", "CANCELLED", "PAID", "COMPLETED", "RESOLVED").contains(ticket.status)) {
            throw ApiException.badRequest("TICKET_ALREADY_RESOLVED", "Không thể hủy yêu cầu đã hoàn tất hoặc đã đóng");
        }

        if (ticket.workflowInstanceId != null) {
            try {
                runtimeEngineService.cancel(ticket.workflowInstanceId);
            } catch (Exception e) {
                log.warn("Notice cancelling workflow instance {}: {}", ticket.workflowInstanceId, e.getMessage());
            }
        }

        ticket.status = "CANCELLED";
        ticket.resolvedAt = Instant.now();
        ticketRepository.saveAndFlush(ticket);

        auditService.append(actor, "CANCEL", "TICKET", ticket.id, null, null,
                Map.of("ticketCode", ticket.ticketCode, "status", "CANCELLED"), null);

        TicketCategoryEntity category = categoryRepository.findById(ticket.categoryId).orElse(null);
        FormVersionEntity formVersion = formVersionRepository.findById(ticket.formVersionId).orElse(null);
        return toDetailResponse(ticket, category, formVersion);
    }

    private String generateTicketCode() {
        String datePrefix = DateTimeFormatter.ofPattern("yyyyMMdd")
                .withZone(ZoneId.of("Asia/Bangkok"))
                .format(Instant.now());
        for (int i = 0; i < 5; i++) {
            String hex = UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
            String candidate = "TCK-" + datePrefix + "-" + hex;
            if (ticketRepository.findByTicketCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "TCK-" + datePrefix + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private TicketSummaryResponse toSummaryResponse(TicketEntity entity) {
        TicketSummaryResponse res = new TicketSummaryResponse();
        res.id = entity.id;
        res.ticketCode = entity.ticketCode;
        res.categoryId = entity.categoryId;
        res.initiatorId = entity.initiatorId;
        res.initiatorName = entity.initiatorName;
        res.initiatorDepartmentId = entity.initiatorDepartmentId;
        res.status = entity.status;
        res.currentStepName = entity.currentStepName;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        res.resolvedAt = entity.resolvedAt;

        categoryRepository.findById(entity.categoryId).ifPresent(c -> {
            res.categoryName = c.name;
            res.categoryCode = c.code;
            res.categoryIcon = c.icon;
            res.categoryColor = c.color;
        });

        return res;
    }

    private TicketDetailResponse toDetailResponse(TicketEntity entity, TicketCategoryEntity category,
            FormVersionEntity formVersion) {
        TicketDetailResponse res = new TicketDetailResponse();
        res.id = entity.id;
        res.ticketCode = entity.ticketCode;
        res.categoryId = entity.categoryId;
        res.formVersionId = entity.formVersionId;
        res.workflowInstanceId = entity.workflowInstanceId;
        res.initiatorId = entity.initiatorId;
        res.initiatorName = entity.initiatorName;
        res.initiatorDepartmentId = entity.initiatorDepartmentId;
        res.formData = jsons.read(entity.formData);
        res.status = entity.status;
        res.currentStepName = entity.currentStepName;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        res.resolvedAt = entity.resolvedAt;

        if (entity.initiatorDepartmentId != null) {
            orgRepository.findById(entity.initiatorDepartmentId).ifPresent(ou -> res.initiatorDepartmentName = ou.name);
        }

        if (category != null) {
            res.categoryName = category.name;
            res.categoryCode = category.code;
            res.categoryIcon = category.icon;
            res.categoryColor = category.color;
        } else {
            categoryRepository.findById(entity.categoryId).ifPresent(c -> {
                res.categoryName = c.name;
                res.categoryCode = c.code;
                res.categoryIcon = c.icon;
                res.categoryColor = c.color;
            });
        }

        if (formVersion != null) {
            res.formVersionNumber = formVersion.versionNumber;
            res.formSchemaSnapshot = jsons.read(formVersion.schemaSnapshot);
            formDefinitionRepository.findById(formVersion.formDefinitionId).ifPresent(fd -> {
                res.formName = fd.name;
                res.formCode = fd.code;
            });
        } else {
            formVersionRepository.findById(entity.formVersionId).ifPresent(fv -> {
                res.formVersionNumber = fv.versionNumber;
                res.formSchemaSnapshot = jsons.read(fv.schemaSnapshot);
                formDefinitionRepository.findById(fv.formDefinitionId).ifPresent(fd -> {
                    res.formName = fd.name;
                    res.formCode = fd.code;
                });
            });
        }

        // Build execution timeline if workflow instance exists
        if (entity.workflowInstanceId != null) {
            res.timeline = buildTimeline(entity.workflowInstanceId);
        }

        return res;
    }

    private List<TicketTimelineNodeDto> buildTimeline(String instanceId) {
        List<TicketTimelineNodeDto> list = new ArrayList<>();
        List<NodeExecutionEntity> nodeExecs = nodeExecutionRepository
                .findByInstanceIdOrderByExecutionOrderAsc(instanceId);
        if (nodeExecs.isEmpty() || (nodeExecs.size() > 1 && nodeExecs.get(0).executionOrder == 0
                && nodeExecs.get(1).executionOrder == 0)) {
            // Fallback for legacy records without execution_order
            nodeExecs = nodeExecutionRepository.findByInstanceIdOrderByStartedAtAsc(instanceId);
        }

        List<WorkflowTaskEntity> tasks = workflowTaskRepository.findByInstanceIdOrderByCreatedAtAsc(instanceId);

        Map<String, WorkflowTaskEntity> taskByNodeExec = new HashMap<>();
        for (WorkflowTaskEntity t : tasks) {
            if (t.nodeExecutionId != null) {
                taskByNodeExec.put(t.nodeExecutionId, t);
            }
        }

        // Preload node definitions snapshot for friendly node names
        Map<String, String> nodeNamesFromDef = new HashMap<>();
        try {
            workflowInstanceRepository.findById(instanceId).ifPresent(wi -> {
                if (wi.workflowVersionId != null) {
                    workflowVersionRepository.findById(wi.workflowVersionId).ifPresent(wv -> {
                        if (wv.definitionSnapshot != null && !wv.definitionSnapshot.isBlank()) {
                            JsonNode def = jsons.read(wv.definitionSnapshot);
                            JsonNode nodesNode = def.path("nodes");
                            if (nodesNode.isArray()) {
                                for (JsonNode n : nodesNode) {
                                    String id = n.path("id").asText();
                                    String name = n.path("name").asText(null);
                                    if (name == null || name.isBlank()) {
                                        name = n.path("data").path("label").asText(null);
                                    }
                                    if (id != null && !id.isBlank() && name != null && !name.isBlank()) {
                                        nodeNamesFromDef.put(id, name);
                                    }
                                }
                            }
                        }
                    });
                }
            });
        } catch (Exception e) {
            log.warn("Could not parse workflow version snapshot for instance {}: {}", instanceId, e.getMessage());
        }

        for (NodeExecutionEntity ne : nodeExecs) {
            TicketTimelineNodeDto item = new TicketTimelineNodeDto();
            item.executionOrder = ne.executionOrder;
            item.nodeId = ne.nodeId;
            item.nodeType = ne.nodeType;
            item.state = ne.state;
            item.outcomePort = ne.outcomePort;
            item.startedAt = ne.startedAt;
            item.completedAt = ne.completedAt;

            WorkflowTaskEntity task = taskByNodeExec.get(ne.id);
            if (task != null) {
                item.nodeName = (task.title != null && !task.title.isBlank()) ? task.title
                        : resolveFriendlyNodeName(ne.nodeId, ne.nodeType, nodeNamesFromDef);
                item.assigneeId = task.assigneeId;
                if (task.assigneeId != null) {
                    item.assigneeName = userRepository.findById(task.assigneeId)
                            .map(u -> u.displayName).orElse(task.assigneeId);
                }
                item.action = task.status;
                if ("CANCELLED".equalsIgnoreCase(task.status) || "CANCELLED".equalsIgnoreCase(ne.state)) {
                    item.state = "CANCELLED";
                    item.action = "CANCELLED";
                }
                if (ne.outputData != null && !ne.outputData.isBlank()) {
                    JsonNode out = jsons.read(ne.outputData);
                    if (out.has("comment")) {
                        item.comment = out.path("comment").asText();
                    }
                }
            } else {
                item.nodeName = resolveFriendlyNodeName(ne.nodeId, ne.nodeType, nodeNamesFromDef);
                if ("CANCELLED".equalsIgnoreCase(ne.state)) {
                    item.action = "CANCELLED";
                } else if ("REJECTED".equalsIgnoreCase(ne.outcomePort)) {
                    item.action = "REJECTED";
                } else if ("COMPLETED".equalsIgnoreCase(ne.state)) {
                    item.action = "COMPLETED";
                } else {
                    item.action = ne.state;
                }
            }

            list.add(item);
        }

        return list;
    }

    private String resolveFriendlyNodeName(String nodeId, String nodeType, Map<String, String> nodeNamesFromDef) {
        if (nodeNamesFromDef != null && nodeNamesFromDef.containsKey(nodeId)) {
            String name = nodeNamesFromDef.get(nodeId);
            if (name != null && !name.isBlank() && !name.equalsIgnoreCase(nodeId)) {
                return name;
            }
        }
        if (nodeType != null) {
            switch (nodeType.toUpperCase(Locale.ROOT)) {
                case "START":
                    return "Bắt đầu";
                case "END":
                    return "Kết thúc";
                case "CONDITION":
                    return "Điều kiện rẽ nhánh";
                case "APPROVAL":
                    return "Phê duyệt";
                case "REVIEW":
                    return "Xem xét";
                case "TASK":
                    return "Công việc";
                case "NOTIFICATION":
                    return "Gửi thông báo";
                case "WAIT":
                    return "Chờ đợi";
                default:
                    break;
            }
        }
        return nodeId;
    }
}
