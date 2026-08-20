package com.acme.workflow.integration.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "credential_references")
public class CredentialReferenceEntity {
    @Id @Column(length = 36) public String id;
    @Column(nullable = false) public String name;
    @Column(name = "credential_type", nullable = false, length = 40) public String credentialType;
    @Column(name = "secret_reference", nullable = false, length = 500) public String secretReference;
    @Column(name = "organization_scope_id", length = 36) public String organizationScopeId;
    @Lob @Column(nullable = false, columnDefinition = "LONGTEXT") public String metadata = "{}";
    @Column(nullable = false) public boolean enabled = true;
    @Column(name = "created_by", nullable = false, length = 36) public String createdBy;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    @Column(name = "updated_at", nullable = false) public Instant updatedAt;
}
