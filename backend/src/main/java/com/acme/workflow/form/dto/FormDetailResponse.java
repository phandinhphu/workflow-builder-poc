package com.acme.workflow.form.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public class FormDetailResponse {
    public String id;
    public String name;
    public String code;
    public String description;
    public String status;
    public Integer latestVersion;
    public String activeVersionId;
    public JsonNode draftSchema;
    public String createdBy;
    public String createdByName;
    public Instant createdAt;
    public Instant updatedAt;
}
