package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class SubworkflowNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("SUBWORKFLOW");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().subworkflow(ctx.instanceId(), ctx.peId(), ctx.execution(), ctx.node(), ctx.context());
    }
}
