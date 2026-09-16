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
        String configuredOutcome = config.path("endType").asText(config.path("outcome").asText(config.path("status").asText(""))).toUpperCase(Locale.ROOT);
        if (configuredOutcome.isBlank()) {
            configuredOutcome = "APPROVED";
        }
        boolean isExplicitRejected = "REJECTED".equals(configuredOutcome);
        boolean hasRejectedApproval = ctx.engine().hasRejectedApproval(ctx.instanceId(), ctx.peId());

        String finalOutcome = (isExplicitRejected || hasRejectedApproval) ? "REJECTED" : configuredOutcome;
        ctx.engine().completeExecution(ctx.execution(), "COMPLETED", finalOutcome, ctx.engine().getJsons().object());
        if ("REJECTED".equals(finalOutcome)) {
            ctx.engine().rejectParticipant(ctx.instanceId(), ctx.peId(), "Quy trình kết thúc tại bước Từ chối");
        } else {
            ctx.engine().completeParticipant(ctx.instanceId(), ctx.peId(), finalOutcome);
        }
    }
}
