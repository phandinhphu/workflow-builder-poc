package com.acme.workflow.runtime.context;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

@Service
public class VariableResolverService {

    private final Jsons jsons;

    public VariableResolverService(Jsons jsons) {
        this.jsons = jsons;
    }

    public ObjectNode resolveVariables(ObjectNode definition, JsonNode overrides) {
        ObjectNode result = jsons.object();
        definition.path("variables").forEach(variable -> {
            JsonNode value = variable.path("defaultValue");
            if ("CONSTANT".equals(value.path("kind").asText()))
                result.set(variable.path("key").asText(), value.path("value"));
        });
        if (overrides != null && overrides.isObject())
            overrides.fields().forEachRemaining(entry -> result.set(entry.getKey(), entry.getValue()));
        return result;
    }
}
