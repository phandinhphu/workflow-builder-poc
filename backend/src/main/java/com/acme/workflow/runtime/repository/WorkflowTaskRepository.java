package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.time.Instant;import java.util.*;
public interface WorkflowTaskRepository extends JpaRepository<WorkflowTaskEntity,String>{
    @Lock(LockModeType.PESSIMISTIC_WRITE) Optional<WorkflowTaskEntity> findLockedById(String id);
    List<WorkflowTaskEntity> findByInstanceIdOrderByCreatedAtAsc(String instanceId);
    List<WorkflowTaskEntity> findByParticipantExecutionIdOrderByCreatedAtDesc(String peId);
    List<WorkflowTaskEntity> findByNodeExecutionIdOrderByCreatedAtAsc(String nodeExecutionId);
    List<WorkflowTaskEntity> findByAssigneeIdOrClaimantIdOrderByCreatedAtDesc(String assigneeId,String claimantId);
    List<WorkflowTaskEntity> findAllByOrderByCreatedAtDesc();
    List<WorkflowTaskEntity> findByStatusInAndDueAtBefore(Collection<String> statuses, Instant due);
    long countByInstanceIdAndStatusIn(String instanceId,Collection<String>statuses);
    long countByInstanceIdAndStatusInAndDueAtBefore(String instanceId,Collection<String>statuses,Instant due);
}
