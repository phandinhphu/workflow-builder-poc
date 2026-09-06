package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class StartNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("START");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().completeAutomatic(
                ctx.instanceId(),
                ctx.peId(),
                ctx.execution(),
                ctx.node(),
                ctx.definition(),
                "SUCCESS",
                ctx.engine().getJsons().object(),
                ctx.depth());
    }
}
