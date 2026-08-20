package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "runtime_jobs")
public class RuntimeJobEntity {
    @Id @Column(length = 36) public String id;
    @Column(name = "instance_id", length = 36) public String instanceId;
    @Column(name = "participant_execution_id", length = 36) public String participantExecutionId;
    @Column(name = "node_execution_id", length = 36) public String nodeExecutionId;
    @Column(name = "task_id", length = 36) public String taskId;
    @Column(name = "job_type", nullable = false, length = 40) public String jobType;
    @Column(name = "dedup_key", nullable = false, unique = true) public String dedupKey;
    @Column(nullable = false, length = 20) public String state;
    @Column(name = "due_at", nullable = false) public Instant dueAt;
    @Lob @Column(nullable = false, columnDefinition = "LONGTEXT") public String payload = "{}";
    @Column(nullable = false) public int attempts;
    @Column(name = "max_attempts", nullable = false) public int maxAttempts = 5;
    @Column(name = "last_error", length = 2000) public String lastError;
    @Column(name = "locked_at") public Instant lockedAt;
    @Column(name = "completed_at") public Instant completedAt;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
}
