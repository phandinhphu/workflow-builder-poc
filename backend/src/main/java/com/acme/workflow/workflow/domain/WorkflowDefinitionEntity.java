package com.acme.workflow.workflow.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="workflow_definitions")
public class WorkflowDefinitionEntity {
    @Id @Column(length=36) public String id;
    @Column(nullable=false) public String name;
    @Column(length=2000) public String description;
    @Column(name="workflow_type",nullable=false,length=100) public String workflowType;
    @Column(name="module_id",nullable=false,length=50) public String moduleId;
    @Column(name="owner_id",nullable=false,length=36) public String ownerId;
    @Column(nullable=false,length=20) public String status;
    @Column(name="draft_version",nullable=false,length=30) public String draftVersion;
    @Lob @Column(name="draft_definition",nullable=false,columnDefinition="LONGTEXT") public String draftDefinition;
    @Column(name="active_version_id",length=36) public String activeVersionId;
    @Version @Column(name="lock_version",nullable=false) public long lockVersion;
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
    @Column(name="updated_at",nullable=false,insertable=false) public Instant updatedAt;
    @Column(name="deleted_at") public Instant deletedAt;
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
}
