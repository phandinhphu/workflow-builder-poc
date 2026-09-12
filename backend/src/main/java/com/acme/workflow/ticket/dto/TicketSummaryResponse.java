package com.acme.workflow.ticket.dto;

import java.time.Instant;

public class TicketSummaryResponse {
    public String id;
    public String ticketCode;
    public String categoryId;
    public String categoryName;
    public String categoryCode;
    public String categoryIcon;
    public String categoryColor;
    public String initiatorId;
    public String initiatorName;
    public String initiatorDepartmentId;
    public String status;
    public String currentStepName;
    public Instant createdAt;
    public Instant updatedAt;
    public Instant resolvedAt;
}
