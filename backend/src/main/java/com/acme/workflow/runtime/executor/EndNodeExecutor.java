package com.acme.workflow.runtime.executor;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

@Component
public class EndNodeExecutor implements NodeExecutor {
    @Override
    public Set<String> supportedTypes() {
        return Set.of("END");
    }

    @Override
    public void execute(NodeExecutionContext ctx) {
        JsonNode config = ctx.node().path("config");
        String endType = config.path("endType").asText(config.path("status").asText("")).toUpperCase(Locale.ROOT);
        boolean isExplicitRejected = "REJECTED".equals(endType);
        boolean hasRejectedApproval = ctx.engine().hasRejectedApproval(ctx.instanceId(), ctx.peId());

        ctx.engine().completeExecution(ctx.execution(), "COMPLETED", "SUCCESS", ctx.engine().getJsons().object());
        if (isExplicitRejected || hasRejectedApproval) {
            ctx.engine().rejectParticipant(ctx.instanceId(), ctx.peId(), "Quy trình kết thúc tại bước Từ chối");
        } else {
            ctx.engine().completeParticipant(ctx.instanceId(), ctx.peId());
        }
    }
}
