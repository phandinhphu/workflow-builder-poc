package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class ConditionNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("CONDITION");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        boolean answer = ctx.engine().getResolver().evaluate(
                ctx.node().path("config").path("condition")
                        .asText(ctx.node().path("config").path("expression").asText()),
                ctx.context());
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
