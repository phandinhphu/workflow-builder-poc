package com.acme.workflow.runtime.task;

import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;

@Component
public class TaskCompletionEvaluator {

    public boolean isCompletionReached(List<WorkflowTaskEntity> siblings, ObjectNode resolution) {
        if (siblings == null || siblings.isEmpty()) return true;
        long completed = siblings.stream().filter(t -> "COMPLETED".equals(t.status)).count();

        JsonNode policyNode = resolution.path("completionPolicy");
        String policy = "ALL";
        double threshold = 1.0;
        String unit = "COUNT";

        if (policyNode.isTextual()) {
            policy = policyNode.asText("ALL").toUpperCase(Locale.ROOT);
        } else if (policyNode.isObject()) {
            policy = policyNode.path("policy").asText("ALL").toUpperCase(Locale.ROOT);
            threshold = policyNode.path("threshold").asDouble(1.0);
            unit = policyNode.path("thresholdUnit").asText("COUNT").toUpperCase(Locale.ROOT);
        }

        return switch (policy) {
            case "ANY" -> completed >= 1;
            case "THRESHOLD" -> "PERCENTAGE".equals(unit)
                    ? (completed * 100.0 / siblings.size()) >= threshold
                    : completed >= threshold;
            default -> completed >= siblings.size();
        };
    }
}
