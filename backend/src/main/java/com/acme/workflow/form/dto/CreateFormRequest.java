package com.acme.workflow.form.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class CreateFormRequest {
    public String name;
    public String code;
    public String description;
    public JsonNode draftSchema;
}
