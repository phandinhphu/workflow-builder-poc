package com.acme.workflow.module.dto;

public record UserModuleAccessResponse(
        String moduleId,
        String moduleName,
        String description,
        String departmentId,
        String departmentName,
        String accessLevel
) {}
