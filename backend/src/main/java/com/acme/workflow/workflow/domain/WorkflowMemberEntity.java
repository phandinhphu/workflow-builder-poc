package com.acme.workflow.workflow.domain;
import jakarta.persistence.*;import java.time.Instant;
@Entity @IdClass(WorkflowMemberId.class) @Table(name="workflow_members")
public class WorkflowMemberEntity{@Id @Column(name="workflow_id",length=36)public String workflowId;@Id @Column(name="user_id",length=36)public String userId;@Column(name="workflow_role",nullable=false,length=20)public String workflowRole;@Column(name="created_at",nullable=false,insertable=false,updatable=false)public Instant createdAt;}
