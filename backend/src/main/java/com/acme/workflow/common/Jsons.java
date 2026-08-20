package com.acme.workflow.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class Jsons {
    private final ObjectMapper mapper;

    public Jsons(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public JsonNode read(String json) {
        try {
            return mapper.readTree(json == null || json.isBlank() ? "{}" : json);
        } catch (JsonProcessingException e) {
            throw ApiException.badRequest("INVALID_JSON", "JSON không hợp lệ: " + e.getOriginalMessage());
        }
    }

    public ObjectNode object(String json) {
        JsonNode node = read(json);
        if (!node.isObject()) throw ApiException.badRequest("INVALID_JSON", "Cần một JSON object");
        return (ObjectNode) node;
    }

    public ObjectNode object() { return mapper.createObjectNode(); }

    public String write(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể ghi JSON", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> map(JsonNode value) {
        return mapper.convertValue(value, Map.class);
    }

    public JsonNode value(Object value) { return mapper.valueToTree(value); }
    public ObjectMapper mapper() { return mapper; }
}
