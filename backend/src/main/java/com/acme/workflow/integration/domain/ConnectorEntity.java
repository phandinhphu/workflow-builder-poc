package com.acme.workflow.integration.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "integration_connectors")
public class ConnectorEntity {
    @Id @Column(length = 36) public String id;
    @Column(name = "connector_key", nullable = false, unique = true, length = 100) public String connectorKey;
    @Column(nullable = false) public String name;
    @Column(name = "connector_type", nullable = false, length = 40) public String connectorType;
    @Column(name = "base_url", length = 1000) public String baseUrl;
    @Column(name = "auth_type", nullable = false, length = 40) public String authType = "NONE";
    @Lob @Column(nullable = false, columnDefinition = "LONGTEXT") public String configuration = "{}";
    @Column(nullable = false) public boolean enabled = true;
    @Version @Column(name = "lock_version", nullable = false) public long lockVersion;
    @Column(name = "created_by", nullable = false, length = 36) public String createdBy;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
    @Column(name = "updated_at", nullable = false) public Instant updatedAt;
}
