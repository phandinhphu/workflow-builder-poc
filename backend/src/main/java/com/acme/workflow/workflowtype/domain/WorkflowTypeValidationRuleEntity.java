package com.acme.workflow.workflowtype.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "workflow_type_validation_rules")
public class WorkflowTypeValidationRuleEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(name = "workflow_type_id", nullable = false, length = 50, insertable = false, updatable = false)
    public String workflowTypeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_type_id", nullable = false)
    @JsonIgnore
    public WorkflowTypeEntity workflowType;

    @Column(name = "rule_code", nullable = false, length = 50)
    public String ruleCode;

    @Column(name = "target_node_type", length = 50)
    public String targetNodeType;

    @Column(name = "error_message", nullable = false, length = 500)
    public String errorMessage;

    @Lob
    @Column(name = "rule_config", columnDefinition = "LONGTEXT")
    public String ruleConfig;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;
}
