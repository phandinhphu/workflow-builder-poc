package com.acme.workflow.runtime.executor;

import com.acme.workflow.runtime.evaluator.StructuredConditionEvaluator;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class ConditionNodeExecutor implements NodeExecutor {
    private final StructuredConditionEvaluator structuredEvaluator;

    public ConditionNodeExecutor() {
        this(new StructuredConditionEvaluator());
    }

    public ConditionNodeExecutor(StructuredConditionEvaluator structuredEvaluator) {
        this.structuredEvaluator = structuredEvaluator != null ? structuredEvaluator : new StructuredConditionEvaluator();
    }

    @Override
    public Set<String> supportedTypes() {
        return Set.of("CONDITION");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        JsonNode config = ctx.node().path("config");
        boolean answer;

        if (config.has("rules") && config.path("rules").isArray()) {
            answer = structuredEvaluator.evaluate(config, ctx.context());
        } else if (config.path("condition").isObject() && config.path("condition").has("rules")) {
            answer = structuredEvaluator.evaluate(config.path("condition"), ctx.context());
        } else {
            // Legacy expression fallback
            String expr = config.path("condition").asText(config.path("expression").asText());
            answer = ctx.engine().getResolver().evaluate(expr, ctx.context());
        }

        ctx.engine().completeAutomatic(
                ctx.instanceId(),
                ctx.peId(),
                ctx.execution(),
                ctx.node(),
                ctx.definition(),
                String.valueOf(answer).toUpperCase(Locale.ROOT),
                ctx.engine().getJsons().object().put("result", answer),
                ctx.depth());
    }
}
