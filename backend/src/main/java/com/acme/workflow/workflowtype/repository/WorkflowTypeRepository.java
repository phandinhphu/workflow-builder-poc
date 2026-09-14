package com.acme.workflow.workflowtype.repository;

import com.acme.workflow.workflowtype.domain.WorkflowTypeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowTypeRepository extends JpaRepository<WorkflowTypeEntity, String> {
    List<WorkflowTypeEntity> findAllByIsActiveTrueOrderBySortOrderAsc();
}

