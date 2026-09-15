package com.acme.workflow.module.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "modules")
public class ModuleEntity {
    @Id
    @Column(length = 50)
    public String id;

    @Column(nullable = false)
    public String name;

    @Column(length = 1000)
    public String description;

    @Column(name = "department_id", length = 36)
    public String departmentId;

    @Column(name = "is_active", nullable = false)
    public boolean isActive = true;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    public Instant updatedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
