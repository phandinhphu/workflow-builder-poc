package com.acme.workflow.runtime.evaluator;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Evaluator for AST Structured Rules in Workflow Condition Nodes.
 * Follows the Decoupled Architecture specification:
 * Evaluates rules from context.formData.<field> (with fallback to variables / top-level context)
 * and applies strictly typed operators.
 */
@Component
public class StructuredConditionEvaluator {

    /**
     * Evaluates a condition config object containing logic ("AND" | "OR") and rules array.
     *
     * @param config  JSON object with "logic" and "rules"
     * @param context Workflow runtime context JSON (containing formData, variables, etc.)
     * @return boolean evaluation result
     */
    public boolean evaluate(JsonNode config, JsonNode context) {
        if (config == null || config.isNull()) {
            return true;
        }

        JsonNode rulesNode = config.path("rules");
        if (!rulesNode.isArray() || rulesNode.isEmpty()) {
            return true;
        }

        String logic = config.path("logic").asText("AND").toUpperCase(Locale.ROOT);
        boolean isAnd = !"OR".equals(logic);

        for (JsonNode rule : rulesNode) {
            boolean ruleResult = evaluateRule(rule, context);
            if (isAnd && !ruleResult) {
                return false;
            }
            if (!isAnd && ruleResult) {
                return true;
            }
        }

        return isAnd;
    }

    /**
     * Evaluates a single condition rule against the context.
     */
    public boolean evaluateRule(JsonNode rule, JsonNode context) {
        if (rule == null || rule.isNull()) {
            return true;
        }

        String field = rule.path("field").asText("").trim();
        if (field.isBlank()) {
            return true;
        }

        String fieldType = rule.path("fieldType").asText("string").toLowerCase(Locale.ROOT);
        String operator = rule.path("operator").asText("EQUALS").toUpperCase(Locale.ROOT);
        JsonNode targetValueNode = rule.get("value");

        JsonNode actualValueNode = resolveFieldValue(field, context);

        return switch (fieldType) {
            case "number" -> evaluateNumber(actualValueNode, operator, targetValueNode, rule);
            case "boolean" -> evaluateBoolean(actualValueNode, operator, targetValueNode);
            case "date", "datetime" -> evaluateDate(actualValueNode, operator, targetValueNode, rule);
            case "select" -> evaluateSelect(actualValueNode, operator, targetValueNode);
            case "multiselect" -> evaluateMultiselect(actualValueNode, operator, targetValueNode);
            case "string", "textarea" -> evaluateString(actualValueNode, operator, targetValueNode);
            default -> evaluateString(actualValueNode, operator, targetValueNode);
        };
    }

    /**
     * Resolves the value of a field from context.
     * Priority:
     * 1. context.formData.<field>
     * 2. Direct dot-path if field contains '.'
     * 3. context.variables.<field>
     * 4. context.<field>
     */
    public JsonNode resolveFieldValue(String field, JsonNode context) {
        if (context == null || context.isNull()) {
            return null;
        }

        // 1. Check formData
        if (context.has("formData") && context.path("formData").has(field)) {
            return context.path("formData").get(field);
        }

        // 2. If path contains dot, traverse it
        if (field.contains(".")) {
            String[] parts = field.split("\\.");
            JsonNode current = context;
            boolean found = true;
            for (String part : parts) {
                if (current != null && current.has(part)) {
                    current = current.get(part);
                } else {
                    found = false;
                    break;
                }
            }
            if (found && current != null) {
                return current;
            }
        }

        // 3. Check variables
        if (context.has("variables") && context.path("variables").has(field)) {
            return context.path("variables").get(field);
        }

        // 4. Direct top-level property
        if (context.has(field)) {
            return context.get(field);
        }

        return null;
    }

    // ==========================================
    // Type-Specific Evaluators
    // ==========================================

    private boolean evaluateNumber(JsonNode actualNode, String operator, JsonNode targetNode, JsonNode rule) {
        BigDecimal actual = toBigDecimal(actualNode);

        if ("BETWEEN".equals(operator)) {
            BigDecimal[] range = parseRange(targetNode, rule);
            if (actual == null || range[0] == null || range[1] == null) {
                return false;
            }
            return actual.compareTo(range[0]) >= 0 && actual.compareTo(range[1]) <= 0;
        }

        BigDecimal target = toBigDecimal(targetNode);

        if (actual == null) {
            return "NOT_EQUALS".equals(operator) && target != null;
        }
        if (target == null) {
            return "NOT_EQUALS".equals(operator);
        }

        int cmp = actual.compareTo(target);
        return switch (operator) {
            case "EQUALS", "==" -> cmp == 0;
            case "NOT_EQUALS", "!=" -> cmp != 0;
            case "GREATER_THAN", ">" -> cmp > 0;
            case "LESS_THAN", "<" -> cmp < 0;
            case "GREATER_THAN_OR_EQUAL", ">=" -> cmp >= 0;
            case "LESS_THAN_OR_EQUAL", "<=" -> cmp <= 0;
            default -> false;
        };
    }

    private boolean evaluateString(JsonNode actualNode, String operator, JsonNode targetNode) {
        String actual = actualNode == null || actualNode.isNull() ? null : actualNode.asText();
        String target = targetNode == null || targetNode.isNull() ? "" : targetNode.asText();

        return switch (operator) {
            case "IS_EMPTY" -> actual == null || actual.trim().isEmpty();
            case "IS_NOT_EMPTY" -> actual != null && !actual.trim().isEmpty();
            case "EQUALS", "==" -> Objects.equals(actual, target);
            case "NOT_EQUALS", "!=" -> !Objects.equals(actual, target);
            case "CONTAINS" -> actual != null && actual.contains(target);
            case "STARTS_WITH" -> actual != null && actual.startsWith(target);
            default -> false;
        };
    }

    private boolean evaluateBoolean(JsonNode actualNode, String operator, JsonNode targetNode) {
        Boolean actual = toBoolean(actualNode);

        return switch (operator) {
            case "IS_TRUE" -> Boolean.TRUE.equals(actual);
            case "IS_FALSE" -> Boolean.FALSE.equals(actual);
            case "EQUALS", "==" -> {
                Boolean target = toBoolean(targetNode);
                yield Objects.equals(actual, target);
            }
            case "NOT_EQUALS", "!=" -> {
                Boolean target = toBoolean(targetNode);
                yield !Objects.equals(actual, target);
            }
            default -> false;
        };
    }

    private boolean evaluateDate(JsonNode actualNode, String operator, JsonNode targetNode, JsonNode rule) {
        Instant actual = toInstant(actualNode);

        if ("BETWEEN".equals(operator)) {
            Instant[] range = parseDateRange(targetNode, rule);
            if (actual == null || range[0] == null || range[1] == null) {
                return false;
            }
            return !actual.isBefore(range[0]) && !actual.isAfter(range[1]);
        }

        Instant target = toInstant(targetNode);

        if (actual == null || target == null) {
            return false;
        }

        return switch (operator) {
            case "BEFORE", "<" -> actual.isBefore(target);
            case "AFTER", ">" -> actual.isAfter(target);
            case "EQUALS", "==" -> actual.equals(target);
            default -> false;
        };
    }

    private boolean evaluateSelect(JsonNode actualNode, String operator, JsonNode targetNode) {
        String actual = actualNode == null || actualNode.isNull() ? "" : actualNode.asText();

        return switch (operator) {
            case "EQUALS", "==" -> {
                String target = targetNode == null || targetNode.isNull() ? "" : targetNode.asText();
                yield actual.equals(target);
            }
            case "NOT_EQUALS", "!=" -> {
                String target = targetNode == null || targetNode.isNull() ? "" : targetNode.asText();
                yield !actual.equals(target);
            }
            case "IN" -> {
                List<String> list = toStringList(targetNode);
                yield list.contains(actual);
            }
            case "NOT_IN" -> {
                List<String> list = toStringList(targetNode);
                yield !list.contains(actual);
            }
            default -> false;
        };
    }

    private boolean evaluateMultiselect(JsonNode actualNode, String operator, JsonNode targetNode) {
        List<String> actualList = toStringList(actualNode);
        List<String> targetList = toStringList(targetNode);

        return switch (operator) {
            case "IS_EMPTY" -> actualList.isEmpty();
            case "CONTAINS_ANY" -> actualList.stream().anyMatch(targetList::contains);
            case "CONTAINS_ALL" -> new HashSet<>(actualList).containsAll(targetList);
            default -> false;
        };
    }

    // ==========================================
    // Type Conversion Helpers
    // ==========================================

    private BigDecimal toBigDecimal(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.decimalValue();
        }
        String text = node.asText().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return new BigDecimal(text);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Boolean toBoolean(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isBoolean()) {
            return node.asBoolean();
        }
        String text = node.asText().trim().toLowerCase(Locale.ROOT);
        if ("true".equals(text) || "1".equals(text)) {
            return true;
        }
        if ("false".equals(text) || "0".equals(text)) {
            return false;
        }
        return null;
    }

    private Instant toInstant(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String text = node.asText().trim();
        if (text.isEmpty()) {
            return null;
        }

        // Try standard Instant parse
        try {
            return Instant.parse(text);
        } catch (DateTimeParseException ignored) {
        }

        // Try LocalDateTime ISO
        try {
            LocalDateTime ldt = LocalDateTime.parse(text, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            return ldt.toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
        }

        // Try LocalDate ISO (e.g. 2026-09-12)
        try {
            LocalDate ld = LocalDate.parse(text, DateTimeFormatter.ISO_LOCAL_DATE);
            return ld.atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (DateTimeParseException ignored) {
        }

        // Try numeric timestamp
        try {
            long epochMillis = Long.parseLong(text);
            return Instant.ofEpochMilli(epochMillis);
        } catch (NumberFormatException ignored) {
        }

        return null;
    }

    private BigDecimal[] parseRange(JsonNode targetNode, JsonNode rule) {
        BigDecimal min = null;
        BigDecimal max = null;

        if (targetNode != null && targetNode.isArray() && targetNode.size() >= 2) {
            min = toBigDecimal(targetNode.get(0));
            max = toBigDecimal(targetNode.get(1));
        } else if (rule.has("secondValue")) {
            min = toBigDecimal(targetNode);
            max = toBigDecimal(rule.get("secondValue"));
        } else if (targetNode != null && targetNode.isTextual() && targetNode.asText().contains(",")) {
            String[] parts = targetNode.asText().split(",");
            if (parts.length >= 2) {
                min = toBigDecimal(parts[0].trim());
                max = toBigDecimal(parts[1].trim());
            }
        }

        return new BigDecimal[]{min, max};
    }

    private Instant[] parseDateRange(JsonNode targetNode, JsonNode rule) {
        Instant from = null;
        Instant to = null;

        if (targetNode != null && targetNode.isArray() && targetNode.size() >= 2) {
            from = toInstant(targetNode.get(0));
            to = toInstant(targetNode.get(1));
        } else if (rule.has("secondValue")) {
            from = toInstant(targetNode);
            to = toInstant(rule.get("secondValue"));
        } else if (targetNode != null && targetNode.isTextual() && targetNode.asText().contains(",")) {
            String[] parts = targetNode.asText().split(",");
            if (parts.length >= 2) {
                from = toInstant(parts[0].trim());
                to = toInstant(parts[1].trim());
            }
        }

        return new Instant[]{from, to};
    }

    private BigDecimal toBigDecimal(String text) {
        try {
            return new BigDecimal(text);
        } catch (Exception e) {
            return null;
        }
    }

    private Instant toInstant(String text) {
        try {
            return Instant.parse(text);
        } catch (Exception e) {
            try {
                return LocalDate.parse(text).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (Exception ex) {
                return null;
            }
        }
    }

    private List<String> toStringList(JsonNode node) {
        if (node == null || node.isNull()) {
            return Collections.emptyList();
        }
        if (node.isArray()) {
            List<String> list = new ArrayList<>();
            for (JsonNode item : node) {
                if (item != null && !item.isNull()) {
                    list.add(item.asText().trim());
                }
            }
            return list;
        }
        String text = node.asText().trim();
        if (text.isEmpty()) {
            return Collections.emptyList();
        }
        if (text.contains(",")) {
            return Arrays.stream(text.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        return List.of(text);
    }
}
