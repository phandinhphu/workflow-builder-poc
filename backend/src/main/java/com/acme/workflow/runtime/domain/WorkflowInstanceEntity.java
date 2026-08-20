package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="workflow_instances")
public class WorkflowInstanceEntity {
    @Id @Column(length=36) public String id;
    @Column(name="request_code",nullable=false,unique=true,length=64) public String requestCode;
    @Column(name="workflow_id",nullable=false,length=36) public String workflowId;
    @Column(name="workflow_version_id",nullable=false,length=36) public String workflowVersionId;
    @Column(name="creator_id",nullable=false,length=36) public String creatorId;
    @Column(nullable=false,length=20) public String status;
    @Column(name="business_outcome",length=50) public String businessOutcome;
    @Lob @Column(name="trigger_data",nullable=false,columnDefinition="LONGTEXT") public String triggerData;
    @Lob @Column(name="variables_data",nullable=false,columnDefinition="LONGTEXT") public String variablesData;
    @Lob @Column(name="context_data",nullable=false,columnDefinition="LONGTEXT") public String contextData="{}";
    @Column(name="idempotency_key") public String idempotencyKey;
    @Column(name="parent_instance_id",length=36) public String parentInstanceId;
    @Column(name="parent_node_execution_id",length=36) public String parentNodeExecutionId;
    @Version @Column(name="lock_version",nullable=false) public long lockVersion;
    @Column(name="started_at",nullable=false) public Instant startedAt;
    @Column(name="completed_at") public Instant completedAt;
    @Column(name="updated_at",nullable=false) public Instant updatedAt;
}
