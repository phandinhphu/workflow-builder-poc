package com.acme.workflow.ticket.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class TicketDetailResponse {
    public String id;
    public String ticketCode;
    public String categoryId;
    public String categoryName;
    public String categoryCode;
    public String categoryIcon;
    public String categoryColor;

    public String formVersionId;
    public int formVersionNumber;
    public String formName;
    public String formCode;
    public JsonNode formSchemaSnapshot;
    public JsonNode formData;

    public String workflowInstanceId;
    public String initiatorId;
    public String initiatorName;
    public String initiatorDepartmentId;
    public String initiatorDepartmentName;

    public String status;
    public String currentStepName;
    public Instant createdAt;
    public Instant updatedAt;
    public Instant resolvedAt;

    public List<TicketTimelineNodeDto> timeline = new ArrayList<>();
}
