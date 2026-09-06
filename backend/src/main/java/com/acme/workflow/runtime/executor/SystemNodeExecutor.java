package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class SystemNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("SYSTEM", "HTTP");
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
                ctx.engine().executeSystem(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node(), ctx.context()),
                ctx.depth());
    }
}
