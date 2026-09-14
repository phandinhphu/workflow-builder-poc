package com.acme.workflow.workflowtype.repository;

import com.acme.workflow.workflowtype.domain.WorkflowTypeAllowedNodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowTypeAllowedNodeRepository extends JpaRepository<WorkflowTypeAllowedNodeEntity, String> {
    List<WorkflowTypeAllowedNodeEntity> findByWorkflowTypeId(String workflowTypeId);
}
