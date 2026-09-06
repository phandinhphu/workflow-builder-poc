package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class JoinNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("JOIN");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().join(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node(), ctx.definition(), ctx.depth());
    }
}
