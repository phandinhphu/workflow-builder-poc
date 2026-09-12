package com.acme.workflow.form.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class UpdateDraftRequest {
    public String name;
    public String description;
    public JsonNode draftSchema;
}
