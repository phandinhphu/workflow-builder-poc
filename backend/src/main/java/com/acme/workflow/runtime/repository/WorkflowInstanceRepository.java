package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.WorkflowInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface WorkflowInstanceRepository extends JpaRepository<WorkflowInstanceEntity,String>{Optional<WorkflowInstanceEntity>findByRequestCode(String code);Optional<WorkflowInstanceEntity>findByWorkflowIdAndIdempotencyKey(String workflowId,String key);List<WorkflowInstanceEntity>findAllByOrderByStartedAtDesc();List<WorkflowInstanceEntity>findByWorkflowIdOrderByStartedAtDesc(String workflowId);long countByWorkflowIdAndStatus(String workflowId,String status);}
