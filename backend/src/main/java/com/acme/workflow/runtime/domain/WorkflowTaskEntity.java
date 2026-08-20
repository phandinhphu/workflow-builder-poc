package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="workflow_tasks")
public class WorkflowTaskEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",nullable=false,length=36) public String instanceId;
    @Column(name="participant_execution_id",length=36) public String participantExecutionId;
    @Column(name="node_execution_id",nullable=false,length=36) public String nodeExecutionId;
    @Column(name="node_id",nullable=false,length=100) public String nodeId;
    @Column(name="task_type",nullable=false,length=50) public String taskType;
    @Column(nullable=false,length=500) public String title;
    @Column(length=2000) public String description;
    @Column(name="assignee_id",length=36) public String assigneeId;
    @Column(name="claimant_id",length=36) public String claimantId;
    @Column(nullable=false,length=20) public String status;
    @Column(nullable=false,length=20) public String priority="NORMAL";
    @Column(name="due_at") public Instant dueAt;
    @Lob @Column(name="form_schema",nullable=false,columnDefinition="LONGTEXT") public String formSchema;
    @Lob @Column(name="allowed_actions",nullable=false,columnDefinition="LONGTEXT") public String allowedActions;
    @Lob @Column(name="resolution_snapshot",nullable=false,columnDefinition="LONGTEXT") public String resolutionSnapshot;
    @Column(name="created_at",nullable=false) public Instant createdAt;
    @Column(name="claimed_at") public Instant claimedAt;
    @Column(name="completed_at") public Instant completedAt;
}
