package com.acme.workflow.category.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ticket_categories")
public class TicketCategoryEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false, unique = true, length = 64)
    public String code;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(length = 64)
    public String icon;

    @Column(length = 32)
    public String color;

    @Column(name = "form_version_id", nullable = false, length = 36)
    public String formVersionId;

    @Column(name = "workflow_executable_id", nullable = false, length = 36)
    public String workflowExecutableId;

    @Lob
    @Column(name = "field_mapping", columnDefinition = "LONGTEXT")
    public String fieldMapping;

    @Column(name = "is_active", nullable = false)
    public boolean isActive = true;

    @Column(name = "created_by", nullable = false, length = 36)
    public String createdBy;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    public Instant updatedAt;

    @Column(name = "deleted_at")
    public Instant deletedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
