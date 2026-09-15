package com.acme.workflow.module;

import com.acme.workflow.module.domain.ModuleEntity;
import com.acme.workflow.module.domain.UserModuleAccessEntity;
import com.acme.workflow.module.repository.ModuleRepository;
import com.acme.workflow.module.repository.UserModuleAccessRepository;
import com.acme.workflow.workflow.domain.WorkflowDefinitionEntity;
import com.acme.workflow.workflow.repository.WorkflowDefinitionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ModuleRepositoryIT {

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private UserModuleAccessRepository userModuleAccessRepository;

    @Autowired
    private WorkflowDefinitionRepository workflowDefinitionRepository;

    @Test
    @DisplayName("Verify 8 seeded modules exist with correct sorting and details")
    void testSeededModules() {
        List<ModuleEntity> activeModules = moduleRepository.findByIsActiveTrueOrderBySortOrderAsc();
        assertThat(activeModules).hasSize(8);
        assertThat(activeModules.get(0).id).isEqualTo("MOD_GENERAL");
        assertThat(activeModules.get(0).name).isEqualTo("Module Chung");
        assertThat(activeModules.get(1).id).isEqualTo("MOD_HR");
        assertThat(activeModules.get(1).departmentId).isEqualTo("ORG-HR");
        assertThat(activeModules.get(2).id).isEqualTo("MOD_IT");
        assertThat(activeModules.get(2).departmentId).isEqualTo("ORG-TECH");
        assertThat(activeModules.get(3).id).isEqualTo("MOD_FIN");
        assertThat(activeModules.get(4).id).isEqualTo("MOD_SALES");
        assertThat(activeModules.get(5).id).isEqualTo("MOD_MKT");
        assertThat(activeModules.get(6).id).isEqualTo("MOD_LEGAL");
        assertThat(activeModules.get(7).id).isEqualTo("MOD_OPS");
    }

    @Test
    @DisplayName("Verify seeded user module access permissions")
    void testSeededUserModuleAccess() {
        List<UserModuleAccessEntity> hrAccess = userModuleAccessRepository.findByUserId("U001");
        assertThat(hrAccess).isNotEmpty();
        Optional<UserModuleAccessEntity> hrModuleAccess = userModuleAccessRepository.findByUserIdAndModuleId("U001", "MOD_HR");
        assertThat(hrModuleAccess).isPresent();
        assertThat(hrModuleAccess.get().accessLevel).isEqualTo("MANAGER");

        Optional<UserModuleAccessEntity> itModuleAccess = userModuleAccessRepository.findByUserIdAndModuleId("U002", "MOD_IT");
        assertThat(itModuleAccess).isPresent();
        assertThat(itModuleAccess.get().accessLevel).isEqualTo("MANAGER");
    }

    @Test
    @DisplayName("Verify workflow definition entity references valid module_id")
    void testWorkflowDefinitionModuleReference() {
        Optional<WorkflowDefinitionEntity> evalWorkflow = workflowDefinitionRepository.findById("6");
        assertThat(evalWorkflow).isPresent();
        assertThat(evalWorkflow.get().moduleId).isEqualTo("MOD_HR");
    }
}
