package com.acme.workflow.module.dto;

import java.time.Instant;

public record ModuleResponse(
        String id,
        String name,
        String description,
        String departmentId,
        String departmentName,
        boolean isActive,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
