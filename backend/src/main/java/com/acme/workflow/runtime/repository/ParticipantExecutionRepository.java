package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.ParticipantExecutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface ParticipantExecutionRepository extends JpaRepository<ParticipantExecutionEntity,String>{
    List<ParticipantExecutionEntity>findByInstanceIdOrderByStartedAtAsc(String instanceId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) Optional<ParticipantExecutionEntity> findLockedById(String id);
    long countByInstanceId(String instanceId);long countByInstanceIdAndStatus(String instanceId,String status);long countByInstanceIdAndStatusIn(String instanceId,Collection<String>statuses);
}
