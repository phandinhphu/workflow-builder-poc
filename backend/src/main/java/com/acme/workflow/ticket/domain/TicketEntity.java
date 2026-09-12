package com.acme.workflow.ticket.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tickets")
public class TicketEntity {
    @Id
    @Column(length = 36)
    public String id;

    @Column(name = "ticket_code", nullable = false, unique = true, length = 64)
    public String ticketCode;

    @Column(name = "category_id", nullable = false, length = 36)
    public String categoryId;

    @Column(name = "form_version_id", nullable = false, length = 36)
    public String formVersionId;

    @Column(name = "workflow_instance_id", length = 36)
    public String workflowInstanceId;

    @Column(name = "initiator_id", nullable = false, length = 36)
    public String initiatorId;

    @Column(name = "initiator_name", nullable = false)
    public String initiatorName;

    @Column(name = "initiator_department_id", length = 36)
    public String initiatorDepartmentId;

    @Lob
    @Column(name = "form_data", nullable = false, columnDefinition = "LONGTEXT")
    public String formData;

    @Column(nullable = false, length = 32)
    public String status = "SUBMITTED";

    @Column(name = "current_step_name")
    public String currentStepName;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    public Instant createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false)
    public Instant updatedAt;

    @Column(name = "resolved_at")
    public Instant resolvedAt;

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
