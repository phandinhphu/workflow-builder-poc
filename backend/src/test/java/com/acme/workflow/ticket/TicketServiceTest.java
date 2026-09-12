package com.acme.workflow.ticket;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.category.domain.TicketCategoryEntity;
import com.acme.workflow.category.repository.TicketCategoryRepository;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.domain.HrmUser;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.runtime.RuntimeEngineService;
import com.acme.workflow.runtime.repository.NodeExecutionRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.runtime.repository.WorkflowTaskRepository;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.acme.workflow.ticket.domain.TicketEntity;
import com.acme.workflow.ticket.dto.CreateTicketRequest;
import com.acme.workflow.ticket.dto.TicketDetailResponse;
import com.acme.workflow.ticket.repository.TicketRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TicketServiceTest {

    private TicketRepository ticketRepository;
    private TicketCategoryRepository categoryRepository;
    private FormVersionRepository formVersionRepository;
    private FormDefinitionRepository formDefinitionRepository;
    private RuntimeEngineService runtimeEngineService;
    private NodeExecutionRepository nodeExecutionRepository;
    private WorkflowTaskRepository workflowTaskRepository;
    private WorkflowInstanceRepository workflowInstanceRepository;
    private WorkflowVersionRepository workflowVersionRepository;
    private HrmUserRepository userRepository;
    private OrganizationUnitRepository orgRepository;
    private CurrentUserService currentUserService;
    private PermissionService permissionService;
    private AuditService auditService;
    private FormSubmissionValidator formValidator;
    private Jsons jsons;
    private TicketService ticketService;

    @BeforeEach
    void setUp() {
        ticketRepository = mock(TicketRepository.class);
        categoryRepository = mock(TicketCategoryRepository.class);
        formVersionRepository = mock(FormVersionRepository.class);
        formDefinitionRepository = mock(FormDefinitionRepository.class);
        runtimeEngineService = mock(RuntimeEngineService.class);
        nodeExecutionRepository = mock(NodeExecutionRepository.class);
        workflowTaskRepository = mock(WorkflowTaskRepository.class);
        workflowInstanceRepository = mock(WorkflowInstanceRepository.class);
        workflowVersionRepository = mock(WorkflowVersionRepository.class);
        userRepository = mock(HrmUserRepository.class);
        orgRepository = mock(OrganizationUnitRepository.class);
        currentUserService = mock(CurrentUserService.class);
        permissionService = mock(PermissionService.class);
        auditService = mock(AuditService.class);
        formValidator = new FormSubmissionValidator();
        jsons = new Jsons(new ObjectMapper());

        ticketService = new TicketService(
                ticketRepository, categoryRepository, formVersionRepository, formDefinitionRepository,
                runtimeEngineService, nodeExecutionRepository, workflowTaskRepository,
                workflowInstanceRepository, workflowVersionRepository, userRepository,
                orgRepository, currentUserService, permissionService, auditService, formValidator, jsons
        );

        when(currentUserService.id()).thenReturn("USR-1");
        when(permissionService.has(eq("USR-1"), anyString(), any())).thenReturn(true);

        HrmUser user = new HrmUser();
        user.id = "USR-1";
        user.displayName = "Nguyễn Văn A";
        user.organizationUnitId = "ORG-1";
        when(userRepository.findById("USR-1")).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("Tạo ticket thành công với category hợp lệ và form đúng schema")
    void createTicket_success() {
        TicketCategoryEntity cat = new TicketCategoryEntity();
        cat.id = "CAT-1";
        cat.name = "Đăng ký Đi công tác";
        cat.code = "CAT_TRIP";
        cat.formVersionId = "FV-1";
        cat.workflowExecutableId = "WV-1";
        cat.isActive = true;
        when(categoryRepository.findByIdAndDeletedAtIsNull("CAT-1")).thenReturn(Optional.of(cat));
        when(categoryRepository.findById("CAT-1")).thenReturn(Optional.of(cat));

        FormVersionEntity fv = new FormVersionEntity();
        fv.id = "FV-1";
        fv.versionNumber = 1;
        fv.formDefinitionId = "FD-1";
        fv.schemaSnapshot = """
                {
                  "fields": [
                    { "key": "destination", "label": "Địa điểm", "type": "string", "required": true },
                    { "key": "budget", "label": "Kinh phí", "type": "number", "required": false }
                  ]
                }
                """;
        when(formVersionRepository.findById("FV-1")).thenReturn(Optional.of(fv));

        when(ticketRepository.findByTicketCode(anyString())).thenReturn(Optional.empty());
        when(ticketRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        when(runtimeEngineService.startWithExecutable(eq("WV-1"), any(), eq("USR-1")))
                .thenReturn(Map.of("id", "INST-123"));

        CreateTicketRequest req = new CreateTicketRequest();
        req.categoryId = "CAT-1";
        req.formData = jsons.read("""
                {
                  "destination": "Đà Nẵng",
                  "budget": 5000000
                }
                """);

        TicketDetailResponse res = ticketService.createTicket(req);

        assertThat(res).isNotNull();
        assertThat(res.ticketCode).startsWith("TCK-");
        assertThat(res.status).isEqualTo("SUBMITTED");
        assertThat(res.workflowInstanceId).isEqualTo("INST-123");
        assertThat(res.categoryName).isEqualTo("Đăng ký Đi công tác");

        verify(runtimeEngineService).startWithExecutable(eq("WV-1"), any(), eq("USR-1"));
        verify(ticketRepository, times(2)).saveAndFlush(any(TicketEntity.class));
    }

    @Test
    @DisplayName("Tạo ticket thất bại khi category không active")
    void createTicket_inactiveCategory_throwsException() {
        TicketCategoryEntity cat = new TicketCategoryEntity();
        cat.id = "CAT-1";
        cat.isActive = false;
        when(categoryRepository.findByIdAndDeletedAtIsNull("CAT-1")).thenReturn(Optional.of(cat));

        CreateTicketRequest req = new CreateTicketRequest();
        req.categoryId = "CAT-1";
        req.formData = jsons.read("{}");

        assertThatThrownBy(() -> ticketService.createTicket(req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("tạm ngưng tiếp nhận");
    }

    @Test
    @DisplayName("Tạo ticket thất bại khi thiếu trường required trong form")
    void createTicket_missingRequiredField_throwsException() {
        TicketCategoryEntity cat = new TicketCategoryEntity();
        cat.id = "CAT-1";
        cat.formVersionId = "FV-1";
        cat.workflowExecutableId = "WV-1";
        cat.isActive = true;
        when(categoryRepository.findByIdAndDeletedAtIsNull("CAT-1")).thenReturn(Optional.of(cat));

        FormVersionEntity fv = new FormVersionEntity();
        fv.id = "FV-1";
        fv.schemaSnapshot = """
                {
                  "fields": [
                    { "key": "destination", "label": "Địa điểm", "type": "string", "required": true }
                  ]
                }
                """;
        when(formVersionRepository.findById("FV-1")).thenReturn(Optional.of(fv));

        CreateTicketRequest req = new CreateTicketRequest();
        req.categoryId = "CAT-1";
        req.formData = jsons.read("{}");

        assertThatThrownBy(() -> ticketService.createTicket(req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("không hợp lệ");
    }

    @Test
    @DisplayName("Hủy ticket thành công khi ticket đang chờ xử lý")
    void cancelTicket_success() {
        TicketEntity ticket = new TicketEntity();
        ticket.id = "TCK-1";
        ticket.ticketCode = "TCK-20260912-0001";
        ticket.initiatorId = "USR-1";
        ticket.status = "SUBMITTED";
        ticket.workflowInstanceId = "INST-1";
        ticket.createdAt = Instant.now();
        ticket.updatedAt = ticket.createdAt;
        ticket.formData = "{}";
        ticket.categoryId = "CAT-1";
        ticket.formVersionId = "FV-1";

        when(ticketRepository.findById("TCK-1")).thenReturn(Optional.of(ticket));
        when(ticketRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        TicketDetailResponse res = ticketService.cancelTicket("TCK-1");

        assertThat(res.status).isEqualTo("CANCELLED");
        verify(runtimeEngineService).cancel("INST-1");
    }
}
