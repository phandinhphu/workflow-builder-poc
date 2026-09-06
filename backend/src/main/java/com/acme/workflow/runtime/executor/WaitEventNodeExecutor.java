package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class WaitEventNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("WAIT_EVENT");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().waitForEvent(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node(), ctx.context());
    }
}
