package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "directory_groups")
public class DirectoryGroup {
    @Id @Column(length = 36) public String id;
    @Column(nullable = false, unique = true, length = 80) public String code;
    @Column(nullable = false) public String name;
    @Column(length = 1000) public String description;
    @Column(name = "organization_scope_id", length = 36) public String organizationScopeId;
    @Column(nullable = false, length = 20) public String status = "ACTIVE";
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    @Column(name = "updated_at", nullable = false) public Instant updatedAt;
}
