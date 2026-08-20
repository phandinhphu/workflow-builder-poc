package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.TaskSubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TaskSubmissionRepository extends JpaRepository<TaskSubmissionEntity,String>{long countByTaskId(String taskId);}
