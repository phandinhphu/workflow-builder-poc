package com.acme.workflow.form.dto;

import java.time.Instant;

public class FormSummaryResponse {
    public String id;
    public String name;
    public String code;
    public String description;
    public String status;
    public Integer latestVersion;
    public int fieldCount;
    public String createdBy;
    public String createdByName;
    public Instant createdAt;
    public Instant updatedAt;
}
