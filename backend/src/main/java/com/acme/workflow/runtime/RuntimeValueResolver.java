package com.acme.workflow.runtime;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class RuntimeValueResolver {
    private static final Pattern TEMPLATE = Pattern.compile("\\$\\{([^}]+)}");
    private static final Pattern COMPARISON = Pattern.compile("^\\$\\{([^}]+)}\\s*(==|!=|>=|<=|>|<)\\s*(.+)$");
    private static final Pattern BRACKET = Pattern.compile("\\[(?:['\"]([^'\"]+)['\"]|(\\d+))]");
    private final Jsons jsons;
    private final ExpressionEngine expressions = new ExpressionEngine();

    public record Resolution(boolean resolved, JsonNode value, List<String> missingPaths, String error) {
        public String firstMissingPath() {
            return missingPaths.isEmpty() ? null : missingPaths.getFirst();
        }
    }

    private record Lookup(boolean found, JsonNode value) {
    }

    public RuntimeValueResolver(Jsons jsons) {
        this.jsons = jsons;
    }

    public JsonNode path(JsonNode context, String path) {
        Lookup lookup = lookup(context, path);
        return lookup.found ? lookup.value : jsons.mapper().nullNode();
    }

    @SuppressWarnings("deprecation")
    public Resolution resolve(JsonNode binding, JsonNode context) {
        if (binding == null || binding.isNull())
            return resolved(jsons.mapper().nullNode());
        if (binding.isTextual())
            return resolveText(binding.asText(), context);
        if (binding.isArray()) {
            ArrayNode output = jsons.mapper().createArrayNode();
            List<String> missing = new ArrayList<>();
            for (JsonNode item : binding) {
                Resolution resolution = resolve(item, context);
                if (resolution.error != null)
                    return resolution;
                missing.addAll(resolution.missingPaths);
                output.add(resolution.value);
            }
            return new Resolution(missing.isEmpty(), output, List.copyOf(missing), null);
        }
        if (binding.isObject()) {
            String kind = binding.path("kind").asText("").toUpperCase();
            if ("CONSTANT".equals(kind))
                return resolve(binding.get("value"), context);
            if ("REFERENCE".equals(kind))
                return resolveReference(binding, context);
            if ("EXPRESSION".equals(kind))
                return resolveExpression(binding.path("expression").asText(), context);

            ObjectNode output = jsons.object();
            List<String> missing = new ArrayList<>();
            Iterator<Map.Entry<String, JsonNode>> fields = binding.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                Resolution resolution = resolve(field.getValue(), context);
                if (resolution.error != null)
                    return resolution;
                missing.addAll(resolution.missingPaths);
                output.set(field.getKey(), resolution.value);
            }
            return new Resolution(missing.isEmpty(), output, List.copyOf(missing), null);
        }
        return resolved(binding.deepCopy());
    }

    public Object resolveValue(JsonNode value, JsonNode context) {
        return jsons.mapper().convertValue(resolve(value, context).value, Object.class);
    }

    public String render(String template, JsonNode context) {
        if (template == null)
            return null;
        Resolution resolution = resolveText(template, context);
        return resolution.value == null || resolution.value.isNull() ? "" : resolution.value.asText();
    }

    public boolean evaluate(String expression, JsonNode context) {
        if (expression == null || expression.isBlank())
            return false;
        String exp = expression.trim();
        if (expressions.looksLikeExpression(exp)) {
            ExpressionEngine.Evaluation evaluation = expressions.evaluate(exp, reference -> {
                Lookup value = lookup(context, reference);
                return value.found ? value.value : jsons.mapper().getNodeFactory().missingNode();
            }, jsons.mapper());
            if (!evaluation.success())
                throw new IllegalArgumentException("Expression không hợp lệ: " + evaluation.error());
            if (evaluation.type() != ExpressionEngine.ValueType.BOOLEAN)
                throw new IllegalArgumentException("Condition phải trả BOOLEAN nhưng nhận " + evaluation.type());
            return evaluation.value().asBoolean();
        }
        Matcher matcher = COMPARISON.matcher(exp);
        if (!matcher.matches()) {
            Matcher exact = TEMPLATE.matcher(exp);
            Lookup direct = lookup(context, exact.matches() ? exact.group(1) : exp);
            JsonNode value = direct.value;
            return direct.found
                    && (value.isBoolean() ? value.asBoolean() : !value.isNull() && !value.asText().isBlank());
        }
        Lookup lookup = lookup(context, matcher.group(1));
        JsonNode left = lookup.value;
        String op = matcher.group(2);
        Object right = parseLiteral(matcher.group(3).trim());
        if (!lookup.found || left == null || left.isNull())
            return "==".equals(op) && right == null;
        if (left.isNumber() && right instanceof Number number)
            return compare(left.decimalValue().compareTo(new BigDecimal(number.toString())), op);
        Object leftValue = left.isBoolean() ? left.asBoolean() : left.asText();
        if ("==".equals(op))
            return Objects.equals(normalize(leftValue), normalize(right));
        if ("!=".equals(op))
            return !Objects.equals(normalize(leftValue), normalize(right));
        return compare(String.valueOf(leftValue).compareTo(String.valueOf(right)), op);
    }

    private Resolution resolveText(String text, JsonNode context) {
        Matcher exact = TEMPLATE.matcher(text);
        if (exact.matches()) {
            Lookup lookup = lookup(context, exact.group(1));
            return lookup.found ? resolved(lookup.value.deepCopy()) : missing(exact.group(1));
        }
        if (expressions.looksLikeExpression(text)) {
            ExpressionEngine.Evaluation evaluation = expressions.evaluate(text, reference -> {
                Lookup value = lookup(context, reference);
                return value.found ? value.value : jsons.mapper().getNodeFactory().missingNode();
            }, jsons.mapper());
            if (evaluation.success())
                return resolved(evaluation.value());
            return new Resolution(false, jsons.mapper().nullNode(), references(text), evaluation.error());
        }
        Matcher matcher = TEMPLATE.matcher(text);
        StringBuffer rendered = new StringBuffer();
        List<String> missing = new ArrayList<>();
        while (matcher.find()) {
            Lookup lookup = lookup(context, matcher.group(1));
            if (!lookup.found)
                missing.add(matcher.group(1));
            JsonNode value = lookup.value;
            String replacement = !lookup.found || value == null || value.isNull() ? ""
                    : value.isValueNode() ? value.asText() : value.toString();
            matcher.appendReplacement(rendered, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(rendered);
        return new Resolution(missing.isEmpty(), jsons.value(rendered.toString()), List.copyOf(missing), null);
    }

    private Resolution resolveReference(JsonNode binding, JsonNode context) {
        String reference = binding.path("path").asText();
        Lookup lookup = lookup(context, reference);
        if (lookup.found)
            return resolved(lookup.value.deepCopy());
        String policy = binding.path("onMissing").asText(binding.path("missingPolicy").asText("NULL")).toUpperCase();
        if ("DEFAULT".equals(policy) && binding.has("defaultValue"))
            return resolve(binding.get("defaultValue"), context);
        if ("ERROR".equals(policy))
            return new Resolution(false, jsons.mapper().nullNode(), List.of(reference),
                    "Không resolve được tham chiếu ${" + reference + "}");
        return missing(reference);
    }

    private Resolution resolveExpression(String expression, JsonNode context) {
        if (expression == null || expression.isBlank())
            return new Resolution(false, jsons.mapper().nullNode(), List.of(), "Expression không được để trống");
        Matcher exact = TEMPLATE.matcher(expression.trim());
        if (exact.matches())
            return resolveText(expression.trim(), context);
        ExpressionEngine.Evaluation evaluation = expressions.evaluate(expression, reference -> {
            Lookup value = lookup(context, reference);
            return value.found ? value.value : jsons.mapper().getNodeFactory().missingNode();
        }, jsons.mapper());
        return evaluation.success() ? resolved(evaluation.value())
                : new Resolution(false, jsons.mapper().nullNode(), references(expression), evaluation.error());
    }

    private Lookup lookup(JsonNode context, String rawPath) {
        String normalized = rawPath == null ? "" : rawPath.trim();
        if (normalized.startsWith("${") && normalized.endsWith("}"))
            normalized = normalized.substring(2, normalized.length() - 1).trim();
        if (normalized.startsWith("$."))
            normalized = normalized.substring(2);
        Matcher brackets = BRACKET.matcher(normalized);
        StringBuffer dotted = new StringBuffer();
        while (brackets.find())
            brackets.appendReplacement(dotted,
                    "." + Matcher.quoteReplacement(brackets.group(1) != null ? brackets.group(1) : brackets.group(2)));
        brackets.appendTail(dotted);

        String candidate = dotted.toString();
        if (!candidate.contains(".") && context != null && context.path("variables").has(candidate))
            candidate = "variables." + candidate;

        JsonNode current = context;
        for (String segment : candidate.split("\\.")) {
            if (segment.isBlank())
                continue;
            if (current == null || current.isMissingNode() || current.isNull())
                return new Lookup(false, jsons.mapper().nullNode());
            if (current.isArray() && segment.matches("\\d+")) {
                int index = Integer.parseInt(segment);
                if (index >= current.size())
                    return new Lookup(false, jsons.mapper().nullNode());
                current = current.get(index);
            } else if (current.isObject() && current.has(segment))
                current = current.get(segment);
            else
                return new Lookup(false, jsons.mapper().nullNode());
        }
        return new Lookup(current != null && !current.isMissingNode(),
                current == null ? jsons.mapper().nullNode() : current);
    }

    private Resolution resolved(JsonNode value) {
        return new Resolution(true, value, List.of(), null);
    }

    private List<String> references(String expression) {
        List<String> result = new ArrayList<>();
        Matcher matcher = TEMPLATE.matcher(expression);
        while (matcher.find())
            result.add(matcher.group(1).trim());
        return List.copyOf(result);
    }

    private Resolution missing(String path) {
        return new Resolution(false, jsons.mapper().nullNode(), List.of(path), null);
    }

    private boolean compare(int comparison, String operator) {
        return switch (operator) {
            case ">" -> comparison > 0;
            case "<" -> comparison < 0;
            case ">=" -> comparison >= 0;
            case "<=" -> comparison <= 0;
            case "==" -> comparison == 0;
            case "!=" -> comparison != 0;
            default -> false;
        };
    }

    private Object normalize(Object value) {
        return value instanceof String text ? text.replaceAll("^[\"']|[\"']$", "") : value;
    }

    private Object parseLiteral(String value) {
        if ("true".equalsIgnoreCase(value))
            return true;
        if ("false".equalsIgnoreCase(value))
            return false;
        if ("null".equalsIgnoreCase(value))
            return null;
        String unquoted = value.replaceAll("^[\"']|[\"']$", "");
        try {
            return new BigDecimal(unquoted);
        } catch (NumberFormatException ignored) {
            return unquoted;
        }
    }
}
