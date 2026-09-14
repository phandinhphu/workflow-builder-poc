package com.acme.workflow.workflowtype.repository;

import com.acme.workflow.workflowtype.domain.WorkflowTypeValidationRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowTypeValidationRuleRepository extends JpaRepository<WorkflowTypeValidationRuleEntity, String> {
    List<WorkflowTypeValidationRuleEntity> findByWorkflowTypeId(String workflowTypeId);
}
