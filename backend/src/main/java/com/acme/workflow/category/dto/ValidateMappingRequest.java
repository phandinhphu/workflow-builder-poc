package com.acme.workflow.category.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class ValidateMappingRequest {
    public String formVersionId;
    public String workflowExecutableId;
    public JsonNode fieldMapping;
}
