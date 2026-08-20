package com.acme.workflow.workflow.repository;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface WorkflowVersionRepository extends JpaRepository<WorkflowVersionEntity,String>{Optional<WorkflowVersionEntity>findByWorkflowIdAndVersionNo(String workflowId,String versionNo);List<WorkflowVersionEntity>findByWorkflowIdOrderByCreatedAtDesc(String workflowId);}
