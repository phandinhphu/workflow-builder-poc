package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.TaskSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface TaskSubmissionRepository extends JpaRepository<TaskSubmissionEntity,String>{
    long countByTaskId(String taskId);
    Optional<TaskSubmissionEntity> findTopByTaskIdOrderByRevisionNoDesc(String taskId);
    List<TaskSubmissionEntity> findByTaskIdOrderByRevisionNoDesc(String taskId);
}
