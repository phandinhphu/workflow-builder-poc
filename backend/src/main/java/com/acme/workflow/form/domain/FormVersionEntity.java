package com.acme.workflow.form.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "form_versions", uniqueConstraints = @UniqueConstraint(columnNames = {"form_definition_id", "version_number"}))
public class FormVersionEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(name = "form_definition_id", nullable = false, length = 36)
    public String formDefinitionId;

    @Column(name = "version_number", nullable = false)
    public int versionNumber;

    @Lob
    @Column(name = "schema_snapshot", nullable = false, columnDefinition = "LONGTEXT")
    public String schemaSnapshot;

    @Column(nullable = false, length = 64)
    public String checksum;

    @Column(name = "published_by", nullable = false, length = 36)
    public String publishedBy;

    @Column(name = "published_at", nullable = false, insertable = false, updatable = false)
    public Instant publishedAt;
}
