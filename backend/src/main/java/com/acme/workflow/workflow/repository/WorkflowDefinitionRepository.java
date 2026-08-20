package com.acme.workflow.workflow.repository;
import com.acme.workflow.workflow.domain.WorkflowDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface WorkflowDefinitionRepository extends JpaRepository<WorkflowDefinitionEntity,String>{List<WorkflowDefinitionEntity>findByStatusNotOrderByUpdatedAtDesc(String status);List<WorkflowDefinitionEntity>findByStatus(String status);}
