package com.acme.workflow.category;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.category.domain.TicketCategoryEntity;
import com.acme.workflow.category.dto.CompatibilityValidationResult;
import com.acme.workflow.category.dto.CreateTicketCategoryRequest;
import com.acme.workflow.category.dto.TicketCategoryResponse;
import com.acme.workflow.category.repository.TicketCategoryRepository;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.workflow.repository.WorkflowDefinitionRepository;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TicketCategoryServiceTest {
    private TicketCategoryRepository categories;
    private CompatibilityValidationService validator;
    private FormVersionRepository formVersions;
    private FormDefinitionRepository formDefinitions;
    private WorkflowVersionRepository workflowVersions;
    private WorkflowDefinitionRepository workflowDefinitions;
    private HrmUserRepository users;
    private CurrentUserService current;
    private PermissionService permissions;
    private AuditService audit;
    private Jsons jsons;
    private TicketCategoryService service;

    @BeforeEach
    void setUp() {
        categories = mock(TicketCategoryRepository.class);
        validator = mock(CompatibilityValidationService.class);
        formVersions = mock(FormVersionRepository.class);
        formDefinitions = mock(FormDefinitionRepository.class);
        workflowVersions = mock(WorkflowVersionRepository.class);
        workflowDefinitions = mock(WorkflowDefinitionRepository.class);
        users = mock(HrmUserRepository.class);
        current = mock(CurrentUserService.class);
        permissions = mock(PermissionService.class);
        audit = mock(AuditService.class);
        jsons = new Jsons(new ObjectMapper());

        service = new TicketCategoryService(
                categories, validator, formVersions, formDefinitions,
                workflowVersions, workflowDefinitions, users, current,
                permissions, audit, jsons
        );

        when(current.id()).thenReturn("U000");
        when(permissions.has(anyString(), anyString(), any())).thenReturn(true);
    }

    @Test
    @DisplayName("Tạo Ticket Category thành công khi Form và Workflow tương thích")
    void create_success_whenCompatible() {
        CreateTicketCategoryRequest request = new CreateTicketCategoryRequest();
        request.name = "Đăng ký Đi Công Tác";
        request.code = "CAT_BUSINESS_TRIP";
        request.formVersionId = "fv-1";
        request.workflowExecutableId = "wv-1";

        CompatibilityValidationResult validResult = new CompatibilityValidationResult();
        validResult.valid = true;
        when(validator.validate(eq("fv-1"), eq("wv-1"), any())).thenReturn(validResult);
        when(categories.existsByCodeAndDeletedAtIsNull("CAT_BUSINESS_TRIP")).thenReturn(false);

        TicketCategoryResponse response = service.create(request);

        assertThat(response).isNotNull();
        assertThat(response.name).isEqualTo("Đăng ký Đi Công Tác");
        assertThat(response.code).isEqualTo("CAT_BUSINESS_TRIP");
        verify(categories).saveAndFlush(any(TicketCategoryEntity.class));
    }

    @Test
    @DisplayName("Tạo Ticket Category thất bại (HTTP 422) khi Form và Workflow không tương thích")
    void create_fails_whenIncompatible() {
        CreateTicketCategoryRequest request = new CreateTicketCategoryRequest();
        request.name = "Đăng ký Đi Công Tác";
        request.code = "CAT_BUSINESS_TRIP";
        request.formVersionId = "fv-1";
        request.workflowExecutableId = "wv-1";

        CompatibilityValidationResult invalidResult = new CompatibilityValidationResult();
        invalidResult.valid = false;
        invalidResult.errors.add(new CompatibilityValidationResult.ValidationError(
                "node_1", "Node 1", "field1", "field1", "number", null, "MISSING_FIELD", "Thiếu trường"
        ));
        when(validator.validate(eq("fv-1"), eq("wv-1"), any())).thenReturn(invalidResult);
        when(categories.existsByCodeAndDeletedAtIsNull("CAT_BUSINESS_TRIP")).thenReturn(false);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.status()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
                    assertThat(apiEx.code()).isEqualTo("INCOMPATIBLE_BINDING");
                });

        verify(categories, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Tạo Ticket Category thất bại khi mã danh mục bị trùng lặp")
    void create_fails_whenDuplicateCode() {
        CreateTicketCategoryRequest request = new CreateTicketCategoryRequest();
        request.name = "Đăng ký Đi Công Tác";
        request.code = "CAT_BUSINESS_TRIP";
        request.formVersionId = "fv-1";
        request.workflowExecutableId = "wv-1";

        when(categories.existsByCodeAndDeletedAtIsNull("CAT_BUSINESS_TRIP")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> {
                    ApiException apiEx = (ApiException) ex;
                    assertThat(apiEx.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(apiEx.code()).isEqualTo("DUPLICATE_CODE");
                });
    }

    @Test
    @DisplayName("Xóa mềm Ticket Category (soft delete)")
    void delete_softDeletesCategory() {
        TicketCategoryEntity entity = new TicketCategoryEntity();
        entity.id = "cat-1";
        entity.code = "CAT_1";
        when(categories.findByIdAndDeletedAtIsNull("cat-1")).thenReturn(Optional.of(entity));

        service.delete("cat-1");

        assertThat(entity.deletedAt).isNotNull();
        verify(categories).saveAndFlush(entity);
    }
}
