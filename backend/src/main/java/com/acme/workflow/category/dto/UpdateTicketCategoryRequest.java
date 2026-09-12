package com.acme.workflow.category.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class UpdateTicketCategoryRequest {
    public String name;
    public String code;
    public String description;
    public String icon;
    public String color;
    public String formVersionId;
    public String workflowExecutableId;
    public JsonNode fieldMapping;
    public Boolean isActive;
}
