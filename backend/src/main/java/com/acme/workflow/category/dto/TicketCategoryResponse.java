package com.acme.workflow.category.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public class TicketCategoryResponse {
    public String id;
    public String name;
    public String code;
    public String description;
    public String icon;
    public String color;
    public String formVersionId;
    public String formDefinitionId;
    public String formName;
    public String formCode;
    public Integer formVersionNumber;
    public JsonNode formSchemaSnapshot;
    public String workflowExecutableId;
    public String workflowId;
    public String workflowName;
    public String workflowVersionNo;
    public JsonNode fieldMapping;
    public boolean isActive;
    public String createdBy;
    public String createdByName;
    public Instant createdAt;
    public Instant updatedAt;
}
