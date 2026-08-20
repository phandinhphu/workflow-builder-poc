package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TaskCandidateUserRepository extends JpaRepository<TaskCandidateUserEntity,TaskCandidateUserId> {
    boolean existsByTaskIdAndUserId(String taskId,String userId);
    List<TaskCandidateUserEntity> findByTaskId(String taskId);
}
