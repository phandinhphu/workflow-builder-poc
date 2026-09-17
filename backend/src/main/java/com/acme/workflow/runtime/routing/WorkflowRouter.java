package com.acme.workflow.runtime.routing;

import com.acme.workflow.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class WorkflowRouter {

    public JsonNode findNode(ObjectNode definition, String id) {
        if (definition != null && definition.has("nodes")) {
            for (JsonNode node : definition.path("nodes")) {
                if (id.equals(node.path("id").asText()))
                    return node;
            }
        }
        throw ApiException.badRequest("NODE_NOT_FOUND", "Không tìm thấy node " + id);
    }

    public String startNode(ObjectNode definition) {
        if (definition != null && definition.has("nodes")) {
            for (JsonNode node : definition.path("nodes")) {
                if ("START".equalsIgnoreCase(node.path("type").asText()))
                    return node.path("id").asText();
            }
        }
        throw ApiException.badRequest("NO_START_NODE", "Workflow version không có START node");
    }

    public List<JsonNode> allOutgoing(ObjectNode definition, String nodeId) {
        List<JsonNode> result = new ArrayList<>();
        if (definition != null && definition.has("connections")) {
            definition.path("connections").forEach(c -> {
                if (nodeId.equals(c.path("sourceNodeId").asText()))
                    result.add(c);
            });
            result.sort(Comparator.comparingInt(c -> c.path("priority").asInt(Integer.MAX_VALUE)));
        }
        return result;
    }

    public List<JsonNode> outgoing(ObjectNode definition, String nodeId, String port) {
        List<JsonNode> all = allOutgoing(definition, nodeId);
        if (all.isEmpty()) return List.of();

        // 1. Exact match on sourcePort
        List<JsonNode> matches = all.stream().filter(c -> port != null && port.equalsIgnoreCase(c.path("sourcePort").asText()))
                .toList();
        if (!matches.isEmpty())
            return matches;

        // 2. Semantic aliases (SUBMITTED <-> SUCCESS <-> COMPLETED, etc.)
        Set<String> aliases = getPortAliases(port);
        List<JsonNode> aliasMatches = all.stream()
                .filter(c -> aliases.contains(c.path("sourcePort").asText().toUpperCase(Locale.ROOT)))
                .toList();
        if (!aliasMatches.isEmpty())
            return aliasMatches;

        // 3. Fallback to default connection
        List<JsonNode> defaults = all.stream().filter(c -> c.path("isDefault").asBoolean()).toList();
        if (!defaults.isEmpty())
            return defaults;

        // 4. If single outgoing connection:
        // - Allow pass-through to CONDITION node regardless of port (user evaluates outcome in Condition node)
        // - Or if outcome is positive (not REJECTED or false), route through it
        if (all.size() == 1) {
            JsonNode singleConn = all.getFirst();
            String targetNodeId = singleConn.path("targetNodeId").asText();
            try {
                JsonNode targetNode = findNode(definition, targetNodeId);
                String targetType = targetNode != null ? targetNode.path("type").asText("").toUpperCase(Locale.ROOT) : "";
                if ("CONDITION".equals(targetType)) {
                    return all;
                }
            } catch (Exception ignored) {
            }
            if (port != null && !port.equalsIgnoreCase("REJECTED") && !port.equalsIgnoreCase("false")) {
                return all;
            }
        }

        return List.of();
    }

    public Set<String> getPortAliases(String port) {
        String p = port == null ? "" : port.toUpperCase(Locale.ROOT);
        return switch (p) {
            case "SUBMITTED", "COMPLETED", "SUCCESS", "SUBMIT" -> Set.of("SUBMITTED", "COMPLETED", "SUCCESS", "SUBMIT", "DEFAULT");
            case "REVIEW_COMPLETED" -> Set.of("REVIEW_COMPLETED", "SUCCESS", "COMPLETED", "DEFAULT", "APPROVED");
            case "APPROVED" -> Set.of("APPROVED", "SUCCESS", "COMPLETED", "DEFAULT", "REVIEW_COMPLETED");
            case "TRUE" -> Set.of("TRUE", "SUCCESS");
            case "FALSE" -> Set.of("FALSE", "REJECTED");
            case "REJECTED", "REJECT" -> Set.of("REJECTED", "REJECT", "FALSE");
            default -> Set.of(p);
        };
    }
}
