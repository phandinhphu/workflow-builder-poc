package com.acme.workflow.workflowtype.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workflow_types")
public class WorkflowTypeEntity {
    @Id
    @Column(length = 50)
    public String id;

    @Column(nullable = false)
    public String name;

    @Column(length = 1000)
    public String description;

    @Column(name = "is_active", nullable = false)
    public boolean isActive = true;

    @Column(name = "sort_order", nullable = false)
    public int sortOrder = 0;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    public Instant updatedAt;

    @OneToMany(mappedBy = "workflowType", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    public List<WorkflowTypeAllowedNodeEntity> allowedNodes = new ArrayList<>();

    @OneToMany(mappedBy = "workflowType", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    public List<WorkflowTypeValidationRuleEntity> validationRules = new ArrayList<>();

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
