package com.acme.workflow.ticket.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateTicketRequest {
    @NotBlank(message = "Category ID không được để trống")
    public String categoryId;

    @NotNull(message = "Dữ liệu formData không được để trống")
    public JsonNode formData;
}
