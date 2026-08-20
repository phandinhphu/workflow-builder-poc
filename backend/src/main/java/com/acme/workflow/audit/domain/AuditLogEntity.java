package com.acme.workflow.audit.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="audit_logs")
public class AuditLogEntity {
    @Id @Column(length=36) public String id;
    @Column(name="actor_id",length=36) public String actorId;
    @Column(nullable=false,length=80) public String action;
    @Column(name="resource_type",nullable=false,length=80) public String resourceType;
    @Column(name="resource_id",nullable=false,length=100) public String resourceId;
    @Column(name="organization_scope_id",length=36) public String organizationScopeId;
    @Lob @Column(name="before_data",columnDefinition="LONGTEXT") public String beforeData;
    @Lob @Column(name="after_data",columnDefinition="LONGTEXT") public String afterData;
    @Lob @Column(columnDefinition="LONGTEXT") public String metadata;
    @Column(name="created_at",nullable=false) public Instant createdAt;
}
