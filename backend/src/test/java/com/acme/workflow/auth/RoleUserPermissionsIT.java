package com.acme.workflow.auth;

import com.acme.workflow.category.TicketCategoryService;
import com.acme.workflow.category.dto.CreateTicketCategoryRequest;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.form.FormService;
import com.acme.workflow.runtime.RuntimeQueryService;
import com.acme.workflow.ticket.TicketService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RoleUserPermissionsIT {

    @Autowired private PermissionService permissionService;
    @Autowired private CurrentUserService currentUserService;
    @Autowired private TicketCategoryService ticketCategoryService;
    @Autowired private TicketService ticketService;
    @Autowired private FormService formService;
    @Autowired private RuntimeQueryService runtimeQueryService;

    private static final String EMPLOYEE_USER_ID = "U002"; // Trần Hoàng Bách - ROLE-USER only

    @BeforeEach
    void setupAuth() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMPLOYEE_USER_ID, null, List.of())
        );
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("ROLE_USER chỉ có quyền TICKET_CREATE và TICKET_VIEW, không có các quyền quản trị khác")
    void roleUser_hasOnlyTicketPermissions() {
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "TICKET_CREATE", null)).isTrue();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "TICKET_VIEW", null)).isTrue();

        assertThat(permissionService.has(EMPLOYEE_USER_ID, "WORKFLOW_VIEW", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "WORKFLOW_EDIT", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "INSTANCE_VIEW", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "INSTANCE_START", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "FORM_VIEW", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "FORM_EDIT", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "CATEGORY_VIEW", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "CATEGORY_MANAGE", null)).isFalse();
        assertThat(permissionService.has(EMPLOYEE_USER_ID, "TICKET_MANAGE", null)).isFalse();

        Map<String, Object> profile = currentUserService.profile();
        @SuppressWarnings("unchecked")
        List<String> permissions = (List<String>) profile.get("permissions");
        assertThat(permissions).containsExactlyInAnyOrder("TICKET_CREATE", "TICKET_VIEW");
    }

    @Test
    @DisplayName("ROLE_USER có thể xem danh mục ticket đang active nhưng không thể quản trị danh mục")
    void roleUser_canViewActiveCategories_cannotManage() {
        var categories = ticketCategoryService.list(null, true);
        assertThat(categories).isNotNull();

        CreateTicketCategoryRequest createReq = new CreateTicketCategoryRequest();
        createReq.name = "Danh mục mới";
        createReq.code = "CAT_UNAUTHORIZED";
        createReq.formVersionId = "FV-1";
        createReq.workflowExecutableId = "WV-1";

        assertThatThrownBy(() -> ticketCategoryService.create(createReq))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("CATEGORY_MANAGE");
    }

    @Test
    @DisplayName("ROLE_USER không thể xem danh sách Form hoặc Runtime Instances")
    void roleUser_cannotAccessFormsOrInstances() {
        assertThatThrownBy(() -> formService.list(null, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("FORM_VIEW");

        assertThatThrownBy(() -> runtimeQueryService.instances(null, null, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("INSTANCE_VIEW");
    }

    @Test
    @DisplayName("ROLE_USER có thể xem danh sách vé của mình nhưng không thể xem toàn bộ vé hệ thống")
    void roleUser_canViewMyTickets_cannotViewAllTickets() {
        var myTickets = ticketService.getMyTickets(null, null, null);
        assertThat(myTickets).isNotNull();

        assertThatThrownBy(() -> ticketService.getAllTickets(null, null, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("TICKET_MANAGE");
    }

    @Test
    @DisplayName("ROLE_USER có thể xem danh sách task cá nhân được phân công")
    void roleUser_canViewAssignedTasks() {
        var tasks = runtimeQueryService.tasks(null, null, null);
        assertThat(tasks).isNotNull();
    }
}
