package com.acme.workflow.workflow.repository;
import com.acme.workflow.workflow.domain.*;import org.springframework.data.jpa.repository.JpaRepository;import java.util.*;
public interface WorkflowMemberRepository extends JpaRepository<WorkflowMemberEntity,WorkflowMemberId>{List<WorkflowMemberEntity>findByWorkflowId(String workflowId);List<WorkflowMemberEntity>findByUserId(String userId);Optional<WorkflowMemberEntity>findByWorkflowIdAndUserId(String workflowId,String userId);void deleteByWorkflowId(String workflowId);}
