package com.acme.workflow.runtime.domain;
import jakarta.persistence.*;
@Entity @IdClass(TaskCandidateUserId.class) @Table(name="task_candidate_users")
public class TaskCandidateUserEntity {
    @Id @Column(name="task_id",length=36) public String taskId;
    @Id @Column(name="user_id",length=36) public String userId;
}
