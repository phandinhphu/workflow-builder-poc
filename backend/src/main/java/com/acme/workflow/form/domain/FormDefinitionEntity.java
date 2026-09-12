package com.acme.workflow.form.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "form_definitions")
public class FormDefinitionEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(nullable = false)
    public String name;

    @Column(nullable = false, unique = true, length = 64)
    public String code;

    @Column(columnDefinition = "TEXT")
    public String description;

    @Column(nullable = false, length = 20)
    public String status;

    @Lob
    @Column(name = "draft_schema", nullable = false, columnDefinition = "LONGTEXT")
    public String draftSchema;

    @Column(name = "active_version_id", length = 36)
    public String activeVersionId;

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
