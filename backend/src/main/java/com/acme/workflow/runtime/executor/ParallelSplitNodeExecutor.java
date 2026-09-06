package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class ParallelSplitNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("PARALLEL_SPLIT");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().split(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node(), ctx.definition());
    }
}
