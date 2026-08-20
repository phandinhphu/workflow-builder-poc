package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="user_role_assignments")
public class UserRoleAssignment {
    @Id @Column(length=36) public String id;
    @Column(name="user_id",nullable=false,length=36) public String userId;
    @Column(name="role_id",nullable=false,length=36) public String roleId;
    @Column(name="organization_scope_id",length=36) public String organizationScopeId;
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
}
