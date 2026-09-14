package com.acme.workflow.workflowtype.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "workflow_type_allowed_nodes")
public class WorkflowTypeAllowedNodeEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(name = "workflow_type_id", nullable = false, length = 50, insertable = false, updatable = false)
    public String workflowTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_type_id", nullable = false)
    @JsonIgnore
    public WorkflowTypeEntity workflowType;

    @Column(name = "node_type", nullable = false, length = 50)
    public String nodeType;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;
}
