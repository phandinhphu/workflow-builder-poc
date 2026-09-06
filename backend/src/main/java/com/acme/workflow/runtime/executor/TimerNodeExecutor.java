package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class TimerNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("TIMER");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().waitTimer(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node());
    }
}
