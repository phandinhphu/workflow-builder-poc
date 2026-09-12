package com.acme.workflow.category.dto;

import java.time.Instant;

public class TicketCategorySummaryResponse {
    public String id;
    public String name;
    public String code;
    public String description;
    public String icon;
    public String color;
    public String formVersionId;
    public String formName;
    public Integer formVersionNumber;
    public String workflowExecutableId;
    public String workflowName;
    public String workflowVersionNo;
    public int mappedFieldsCount;
    public boolean isActive;
    public String createdBy;
    public String createdByName;
    public Instant createdAt;
    public Instant updatedAt;
}
