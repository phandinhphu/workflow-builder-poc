package com.acme.workflow.category;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.category.domain.TicketCategoryEntity;
import com.acme.workflow.category.dto.*;
import com.acme.workflow.category.repository.TicketCategoryRepository;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormDefinitionEntity;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.workflow.domain.WorkflowDefinitionEntity;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowDefinitionRepository;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class TicketCategoryService {
    private static final Pattern CODE_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{2,64}$");

    private final TicketCategoryRepository categories;
    private final CompatibilityValidationService validator;
    private final FormVersionRepository formVersions;
    private final FormDefinitionRepository formDefinitions;
    private final WorkflowVersionRepository workflowVersions;
    private final WorkflowDefinitionRepository workflowDefinitions;
    private final HrmUserRepository users;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;
    private final Jsons jsons;

    public TicketCategoryService(TicketCategoryRepository categories,
                                 CompatibilityValidationService validator,
                                 FormVersionRepository formVersions,
                                 FormDefinitionRepository formDefinitions,
                                 WorkflowVersionRepository workflowVersions,
                                 WorkflowDefinitionRepository workflowDefinitions,
                                 HrmUserRepository users,
                                 CurrentUserService current,
                                 PermissionService permissions,
                                 AuditService audit,
                                 Jsons jsons) {
        this.categories = categories;
        this.validator = validator;
        this.formVersions = formVersions;
        this.formDefinitions = formDefinitions;
        this.workflowVersions = workflowVersions;
        this.workflowDefinitions = workflowDefinitions;
        this.users = users;
        this.current = current;
        this.permissions = permissions;
        this.audit = audit;
        this.jsons = jsons;
    }

    private void requireView(String actor) {
        if (!permissions.has(actor, "CATEGORY_VIEW", null)
                && !permissions.has(actor, "CATEGORY_MANAGE", null)
                && !permissions.has(actor, "WORKFLOW_VIEW", null)) {
            throw ApiException.forbidden("Thiếu quyền CATEGORY_VIEW để xem danh mục ticket");
        }
    }

    private void requireManage(String actor) {
        if (!permissions.has(actor, "CATEGORY_MANAGE", null)
                && !permissions.has(actor, "WORKFLOW_EDIT", null)) {
            throw ApiException.forbidden("Thiếu quyền CATEGORY_MANAGE để tạo hoặc chỉnh sửa danh mục ticket");
        }
    }

    public CompatibilityValidationResult validateMapping(ValidateMappingRequest request) {
        String actor = current.id();
        requireView(actor);
        return validator.validate(request.formVersionId, request.workflowExecutableId, request.fieldMapping);
    }

    @Transactional
    public TicketCategoryResponse create(CreateTicketCategoryRequest request) {
        String actor = current.id();
        requireManage(actor);

        validateBasicFields(request.name, request.code);

        String code = request.code.trim().toUpperCase(Locale.ROOT);
        if (categories.existsByCodeAndDeletedAtIsNull(code)) {
            throw ApiException.badRequest("DUPLICATE_CODE", "Mã danh mục '" + code + "' đã tồn tại");
        }

        // Run compatibility check
        CompatibilityValidationResult validation = validator.validate(
                request.formVersionId,
                request.workflowExecutableId,
                request.fieldMapping
        );
        if (!validation.valid) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INCOMPATIBLE_BINDING",
                    "Cấu hình liên kết Form và Workflow không tương thích: " + jsons.write(validation.errors)
            );
        }

        TicketCategoryEntity entity = new TicketCategoryEntity();
        entity.id = Ids.uuid();
        entity.name = request.name.trim();
        entity.code = code;
        entity.description = request.description != null ? request.description.trim() : null;
        entity.icon = request.icon != null ? request.icon.trim() : "FolderIcon";
        entity.color = request.color != null ? request.color.trim() : "#3B82F6";
        entity.formVersionId = request.formVersionId;
        entity.workflowExecutableId = request.workflowExecutableId;
        entity.fieldMapping = request.fieldMapping != null ? jsons.write(request.fieldMapping) : "{}";
        entity.isActive = request.isActive == null || request.isActive;
        entity.createdBy = actor;

        categories.saveAndFlush(entity);

        TicketCategoryResponse response = toDetailResponse(entity);
        audit.append(actor, "CREATE", "TICKET_CATEGORY", entity.id, null, null, jsons.map(jsons.value(response)), null);
        return response;
    }

    @Transactional
    public TicketCategoryResponse update(String id, UpdateTicketCategoryRequest request) {
        String actor = current.id();
        requireManage(actor);

        TicketCategoryEntity entity = categories.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục ticket: " + id));

        validateBasicFields(request.name, request.code);

        String code = request.code.trim().toUpperCase(Locale.ROOT);
        if (categories.existsByCodeAndIdNotAndDeletedAtIsNull(code, id)) {
            throw ApiException.badRequest("DUPLICATE_CODE", "Mã danh mục '" + code + "' đã tồn tại");
        }

        // Run compatibility check
        CompatibilityValidationResult validation = validator.validate(
                request.formVersionId,
                request.workflowExecutableId,
                request.fieldMapping
        );
        if (!validation.valid) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "INCOMPATIBLE_BINDING",
                    "Cấu hình liên kết Form và Workflow không tương thích: " + jsons.write(validation.errors)
            );
        }

        TicketCategoryResponse before = toDetailResponse(entity);

        entity.name = request.name.trim();
        entity.code = code;
        entity.description = request.description != null ? request.description.trim() : null;
        entity.icon = request.icon != null ? request.icon.trim() : "FolderIcon";
        entity.color = request.color != null ? request.color.trim() : "#3B82F6";
        entity.formVersionId = request.formVersionId;
        entity.workflowExecutableId = request.workflowExecutableId;
        entity.fieldMapping = request.fieldMapping != null ? jsons.write(request.fieldMapping) : "{}";
        if (request.isActive != null) {
            entity.isActive = request.isActive;
        }

        categories.saveAndFlush(entity);

        TicketCategoryResponse after = toDetailResponse(entity);
        audit.append(actor, "UPDATE", "TICKET_CATEGORY", entity.id, null, jsons.map(jsons.value(before)), jsons.map(jsons.value(after)), null);
        return after;
    }

    public List<TicketCategorySummaryResponse> list(String search, Boolean activeOnly) {
        String actor = current.id();
        requireView(actor);

        List<TicketCategoryEntity> list = Boolean.TRUE.equals(activeOnly)
                ? categories.findByIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc()
                : categories.findByDeletedAtIsNullOrderByCreatedAtDesc();

        String query = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        return list.stream()
                .filter(c -> query.isEmpty()
                        || c.name.toLowerCase(Locale.ROOT).contains(query)
                        || c.code.toLowerCase(Locale.ROOT).contains(query))
                .map(this::toSummaryResponse)
                .toList();
    }

    public TicketCategoryResponse get(String id) {
        String actor = current.id();
        requireView(actor);

        TicketCategoryEntity entity = categories.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục ticket: " + id));

        return toDetailResponse(entity);
    }

    @Transactional
    public void delete(String id) {
        String actor = current.id();
        requireManage(actor);

        TicketCategoryEntity entity = categories.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục ticket: " + id));

        entity.deletedAt = Instant.now();
        categories.saveAndFlush(entity);

        audit.append(actor, "DELETE", "TICKET_CATEGORY", id, null, Map.of("id", id, "code", entity.code), null, null);
    }

    @Transactional
    public TicketCategoryResponse toggleActive(String id, boolean active) {
        String actor = current.id();
        requireManage(actor);

        TicketCategoryEntity entity = categories.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục ticket: " + id));

        entity.isActive = active;
        categories.saveAndFlush(entity);

        TicketCategoryResponse response = toDetailResponse(entity);
        audit.append(actor, "UPDATE_STATUS", "TICKET_CATEGORY", id, null, null, Map.of("isActive", active), null);
        return response;
    }

    private void validateBasicFields(String name, String code) {
        if (name == null || name.trim().isEmpty()) {
            throw ApiException.badRequest("NAME_REQUIRED", "Tên danh mục không được để trống");
        }
        if (code == null || code.trim().isEmpty()) {
            throw ApiException.badRequest("CODE_REQUIRED", "Mã danh mục không được để trống");
        }
        if (!CODE_PATTERN.matcher(code.trim()).matches()) {
            throw ApiException.badRequest("INVALID_CODE", "Mã danh mục chỉ được chứa chữ cái, số, gạch dưới và gạch ngang (2-64 ký tự)");
        }
    }

    private TicketCategoryResponse toDetailResponse(TicketCategoryEntity entity) {
        TicketCategoryResponse res = new TicketCategoryResponse();
        res.id = entity.id;
        res.name = entity.name;
        res.code = entity.code;
        res.description = entity.description;
        res.icon = entity.icon;
        res.color = entity.color;
        res.formVersionId = entity.formVersionId;
        res.workflowExecutableId = entity.workflowExecutableId;
        res.fieldMapping = jsons.read(entity.fieldMapping != null ? entity.fieldMapping : "{}");
        res.isActive = entity.isActive;
        res.createdBy = entity.createdBy;
        res.createdByName = users.findById(entity.createdBy).map(u -> u.displayName).orElse(entity.createdBy);
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;

        // Form details
        formVersions.findById(entity.formVersionId).ifPresent(fv -> {
            res.formDefinitionId = fv.formDefinitionId;
            res.formVersionNumber = fv.versionNumber;
            res.formSchemaSnapshot = jsons.read(fv.schemaSnapshot);
            formDefinitions.findById(fv.formDefinitionId).ifPresent(fd -> {
                res.formName = fd.name;
                res.formCode = fd.code;
            });
        });

        // Workflow details
        workflowVersions.findById(entity.workflowExecutableId).ifPresent(wv -> {
            res.workflowId = wv.workflowId;
            res.workflowVersionNo = wv.versionNo;
            workflowDefinitions.findById(wv.workflowId).ifPresent(wd -> {
                res.workflowName = wd.name;
            });
        });

        return res;
    }

    private TicketCategorySummaryResponse toSummaryResponse(TicketCategoryEntity entity) {
        TicketCategorySummaryResponse res = new TicketCategorySummaryResponse();
        res.id = entity.id;
        res.name = entity.name;
        res.code = entity.code;
        res.description = entity.description;
        res.icon = entity.icon;
        res.color = entity.color;
        res.formVersionId = entity.formVersionId;
        res.workflowExecutableId = entity.workflowExecutableId;
        res.isActive = entity.isActive;
        res.createdBy = entity.createdBy;
        res.createdByName = users.findById(entity.createdBy).map(u -> u.displayName).orElse(entity.createdBy);
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;

        JsonNode mappingNode = jsons.read(entity.fieldMapping != null ? entity.fieldMapping : "{}");
        res.mappedFieldsCount = mappingNode.isObject() ? mappingNode.size() : 0;

        formVersions.findById(entity.formVersionId).ifPresent(fv -> {
            res.formVersionNumber = fv.versionNumber;
            formDefinitions.findById(fv.formDefinitionId).ifPresent(fd -> {
                res.formName = fd.name;
            });
        });

        workflowVersions.findById(entity.workflowExecutableId).ifPresent(wv -> {
            res.workflowVersionNo = wv.versionNo;
            workflowDefinitions.findById(wv.workflowId).ifPresent(wd -> {
                res.workflowName = wd.name;
            });
        });

        return res;
    }
}
