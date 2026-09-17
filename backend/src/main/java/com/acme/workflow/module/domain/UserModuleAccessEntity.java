package com.acme.workflow.module.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_module_access", uniqueConstraints = {
    @UniqueConstraint(name = "uq_user_module", columnNames = {"user_id", "module_id"})
})
public class UserModuleAccessEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(name = "user_id", nullable = false, length = 36)
    public String userId;

    @Column(name = "module_id", nullable = false, length = 50)
    public String moduleId;

    @Column(name = "access_level", nullable = false, length = 20)
    public String accessLevel = "VIEWER";

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    public Instant updatedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
