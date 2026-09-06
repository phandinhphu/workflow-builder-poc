package com.acme.workflow.runtime.executor;

import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class EndNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("END");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        ctx.engine().completeExecution(ctx.execution(), "COMPLETED", "SUCCESS", ctx.engine().getJsons().object());
        ctx.engine().completeParticipant(ctx.instanceId(), ctx.peId());
    }
}
