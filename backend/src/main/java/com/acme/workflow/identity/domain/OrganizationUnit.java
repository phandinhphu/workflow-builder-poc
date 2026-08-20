package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="organization_units")
public class OrganizationUnit {
    @Id @Column(length=36) public String id;
    @Column(nullable=false,unique=true,length=64) public String code;
    @Column(nullable=false) public String name;
    @Column(name="unit_type",nullable=false,length=32) public String unitType;
    @Column(name="hierarchy_level",nullable=false) public int hierarchyLevel;
    @Column(name="parent_id",length=36) public String parentId;
    @Column(name="hierarchy_path",nullable=false,length=1000) public String hierarchyPath;
    @Column(name="head_user_id",length=36) public String headUserId;
    @Column(nullable=false,length=20) public String status="ACTIVE";
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
    @Column(name="updated_at",nullable=false,insertable=false) public Instant updatedAt;
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
}
