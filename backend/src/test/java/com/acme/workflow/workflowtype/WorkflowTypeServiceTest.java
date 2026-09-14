package com.acme.workflow.workflowtype;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.workflowtype.domain.WorkflowTypeAllowedNodeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeValidationRuleEntity;
import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import com.acme.workflow.workflowtype.dto.WorkflowTypeResponse;
import com.acme.workflow.workflowtype.repository.WorkflowTypeAllowedNodeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeValidationRuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class WorkflowTypeServiceTest {
    private WorkflowTypeRepository workflowTypeRepo;
    private WorkflowTypeAllowedNodeRepository allowedNodeRepo;
    private WorkflowTypeValidationRuleRepository validationRuleRepo;
    private WorkflowTypeService service;

    @BeforeEach
    void setUp() {
        workflowTypeRepo = mock(WorkflowTypeRepository.class);
        allowedNodeRepo = mock(WorkflowTypeAllowedNodeRepository.class);
        validationRuleRepo = mock(WorkflowTypeValidationRuleRepository.class);
        service = new WorkflowTypeService(workflowTypeRepo, allowedNodeRepo, validationRuleRepo);
    }

    @Test
    @DisplayName("getAllActive with includeDetails=false returns summaries")
    void testGetAllActiveSummary() {
        WorkflowTypeEntity type1 = new WorkflowTypeEntity();
        type1.id = "APPROVAL";
        type1.name = "Quy trình phê duyệt";
        type1.isActive = true;
        type1.sortOrder = 1;

        when(workflowTypeRepo.findAllByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(type1));

        List<WorkflowTypeResponse> result = service.getAllActive(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id).isEqualTo("APPROVAL");
        assertThat(result.get(0).allowedNodes).isNull();
        assertThat(result.get(0).rules).isNull();
    }

    @Test
    @DisplayName("getAllActive with includeDetails=true returns details with allowedNodes and rules")
    void testGetAllActiveDetails() {
        WorkflowTypeEntity type1 = new WorkflowTypeEntity();
        type1.id = "APPROVAL";
        type1.name = "Quy trình phê duyệt";
        type1.isActive = true;
        type1.sortOrder = 1;

        WorkflowTypeAllowedNodeEntity node1 = new WorkflowTypeAllowedNodeEntity();
        node1.id = "wtan-1";
        node1.workflowTypeId = "APPROVAL";
        node1.nodeType = "START";

        WorkflowTypeValidationRuleEntity rule1 = new WorkflowTypeValidationRuleEntity();
        rule1.id = "wtvr-1";
        rule1.workflowTypeId = "APPROVAL";
        rule1.ruleCode = "REQUIRED_NODE";
        rule1.targetNodeType = "APPROVAL";
        rule1.errorMessage = "Cần có bước phê duyệt";

        when(workflowTypeRepo.findAllByIsActiveTrueOrderBySortOrderAsc()).thenReturn(List.of(type1));
        when(allowedNodeRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(node1));
        when(validationRuleRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(rule1));

        List<WorkflowTypeResponse> result = service.getAllActive(true);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id).isEqualTo("APPROVAL");
        assertThat(result.get(0).allowedNodes).containsExactly("START");
        assertThat(result.get(0).rules).hasSize(1);
        assertThat(result.get(0).rules.get(0).ruleCode).isEqualTo("REQUIRED_NODE");
    }

    @Test
    @DisplayName("getById returns type or throws 404")
    void testGetById() {
        WorkflowTypeEntity type = new WorkflowTypeEntity();
        type.id = "NOTIFICATION";
        type.name = "Quy trình thông báo";

        when(workflowTypeRepo.findById("NOTIFICATION")).thenReturn(Optional.of(type));
        when(workflowTypeRepo.findById("UNKNOWN")).thenReturn(Optional.empty());

        WorkflowTypeResponse res = service.getById("NOTIFICATION", false);
        assertThat(res.id).isEqualTo("NOTIFICATION");

        assertThatThrownBy(() -> service.getById("UNKNOWN", false))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Không tìm thấy loại workflow: UNKNOWN");
    }

    @Test
    @DisplayName("getAllowedNodes returns list of node type strings")
    void testGetAllowedNodes() {
        when(workflowTypeRepo.existsById("APPROVAL")).thenReturn(true);
        when(workflowTypeRepo.existsById("UNKNOWN")).thenReturn(false);

        WorkflowTypeAllowedNodeEntity node1 = new WorkflowTypeAllowedNodeEntity();
        node1.nodeType = "START";
        WorkflowTypeAllowedNodeEntity node2 = new WorkflowTypeAllowedNodeEntity();
        node2.nodeType = "APPROVAL";

        when(allowedNodeRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(node1, node2));

        List<String> nodes = service.getAllowedNodes("APPROVAL");
        assertThat(nodes).containsExactly("START", "APPROVAL");

        assertThatThrownBy(() -> service.getAllowedNodes("UNKNOWN"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    @DisplayName("getValidationRules returns list of rule DTOs")
    void testGetValidationRules() {
        when(workflowTypeRepo.existsById("APPROVAL")).thenReturn(true);
        when(workflowTypeRepo.existsById("UNKNOWN")).thenReturn(false);

        WorkflowTypeValidationRuleEntity rule1 = new WorkflowTypeValidationRuleEntity();
        rule1.id = "rule-1";
        rule1.workflowTypeId = "APPROVAL";
        rule1.ruleCode = "REQUIRED_NODE";
        rule1.targetNodeType = "APPROVAL";
        rule1.errorMessage = "Must have approval";
        rule1.ruleConfig = "{\"min\":1}";

        when(validationRuleRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(rule1));

        List<ValidationRuleDto> rules = service.getValidationRules("APPROVAL");
        assertThat(rules).hasSize(1);
        assertThat(rules.get(0).ruleCode).isEqualTo("REQUIRED_NODE");
        assertThat(rules.get(0).targetNodeType).isEqualTo("APPROVAL");

        assertThatThrownBy(() -> service.getValidationRules("UNKNOWN"))
                .isInstanceOf(ApiException.class);
    }
}
