package com.acme.workflow.form.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;

public class FormVersionResponse {
    public String id;
    public String formDefinitionId;
    public int versionNumber;
    public JsonNode schemaSnapshot;
    public String checksum;
    public String publishedBy;
    public String publishedByName;
    public Instant publishedAt;
}
