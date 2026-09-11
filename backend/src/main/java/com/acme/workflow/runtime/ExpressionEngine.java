package com.acme.workflow.runtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Function;
import java.util.regex.Pattern;

/** A small deterministic, side-effect-free expression DSL. */
public final class ExpressionEngine {
    public enum ValueType { NUMBER, STRING, BOOLEAN, DATE, OBJECT, ARRAY, NULL, UNKNOWN }
    public record Analysis(boolean valid, ValueType type, List<String> errors, List<String> references) {}
    public record Evaluation(boolean success, JsonNode value, ValueType type, String error) {}

    private static final Pattern EXPRESSION_MARKER = Pattern.compile("(?:\\$\\{[^}]+}|\\([^)]*\\))\\s*(?:[+\\-*/%]|==|!=|>=|<=|>|<|&&|\\|\\|)|^(?:!|NOT\\s+|(?:contains|in|matches|length|lower|upper|coalesce|isNull|isNotNull)\\s*\\()", Pattern.CASE_INSENSITIVE);

    public boolean looksLikeExpression(String value) {
        return value != null && EXPRESSION_MARKER.matcher(value.trim()).find();
    }

    public Analysis analyze(String expression, Function<String, ValueType> typeResolver) {
        try {
            Node ast = new Parser(expression).parse();
            List<String> errors = new ArrayList<>();
            List<String> references = new ArrayList<>();
            ValueType type = infer(ast, typeResolver, errors, references);
            return new Analysis(errors.isEmpty(), type, List.copyOf(errors), references.stream().distinct().toList());
        } catch (ExpressionException error) {
            return new Analysis(false, ValueType.UNKNOWN, List.of(error.getMessage()), List.of());
        }
    }

    public Evaluation evaluate(String expression, Function<String, JsonNode> valueResolver, ObjectMapper mapper) {
        try {
            Node ast = new Parser(expression).parse();
            Value value = evaluate(ast, valueResolver);
            return new Evaluation(true, mapper.valueToTree(value.value), value.type, null);
        } catch (ExpressionException | ArithmeticException error) {
            return new Evaluation(false, mapper.nullNode(), ValueType.UNKNOWN, error.getMessage());
        }
    }

    private ValueType infer(Node node, Function<String, ValueType> resolver, List<String> errors, List<String> references) {
        if (node instanceof Literal literal) return literal.type;
        if (node instanceof Reference reference) {
            references.add(reference.path);
            return resolver.apply(reference.path);
        }
        if (node instanceof Unary unary) {
            ValueType operand = infer(unary.operand, resolver, errors, references);
            ValueType expected = "!".equals(unary.operator) ? ValueType.BOOLEAN : ValueType.NUMBER;
            require(operand, expected, "Toán tử " + unary.operator, errors);
            return expected;
        }
        if (node instanceof Binary binary) {
            ValueType left = infer(binary.left, resolver, errors, references);
            ValueType right = infer(binary.right, resolver, errors, references);
            return inferBinary(binary.operator, left, right, errors);
        }
        FunctionCall function = (FunctionCall) node;
        List<ValueType> arguments = function.arguments.stream().map(argument -> infer(argument, resolver, errors, references)).toList();
        return inferFunction(function.name, arguments, errors);
    }

    private ValueType inferBinary(String operator, ValueType left, ValueType right, List<String> errors) {
        if (List.of("+", "-", "*", "/", "%").contains(operator)) {
            require(left, ValueType.NUMBER, "Vế trái của " + operator, errors);
            require(right, ValueType.NUMBER, "Vế phải của " + operator, errors);
            return ValueType.NUMBER;
        }
        if (List.of("&&", "||").contains(operator)) {
            require(left, ValueType.BOOLEAN, "Vế trái của " + operator, errors);
            require(right, ValueType.BOOLEAN, "Vế phải của " + operator, errors);
            return ValueType.BOOLEAN;
        }
        if (List.of(">", ">=", "<", "<=").contains(operator)) {
            if (left == ValueType.UNKNOWN || right == ValueType.UNKNOWN) errors.add("Không xác định được kiểu dữ liệu cho toán tử " + operator);
            else if (left != right || !List.of(ValueType.NUMBER, ValueType.DATE, ValueType.STRING).contains(left)) errors.add("Toán tử " + operator + " yêu cầu hai toán hạng cùng kiểu NUMBER, DATE hoặc STRING nhưng nhận " + left + " và " + right);
            return ValueType.BOOLEAN;
        }
        if (List.of("==", "!=").contains(operator)) {
            if (left == ValueType.UNKNOWN || right == ValueType.UNKNOWN) errors.add("Không xác định được kiểu dữ liệu để so sánh " + operator);
            else if (left != right && left != ValueType.NULL && right != ValueType.NULL) errors.add("Không thể so sánh " + left + " với " + right + " bằng " + operator);
            return ValueType.BOOLEAN;
        }
        errors.add("Toán tử không được hỗ trợ: " + operator);
        return ValueType.UNKNOWN;
    }

    private ValueType inferFunction(String rawName, List<ValueType> arguments, List<String> errors) {
        String name = rawName.toLowerCase(Locale.ROOT);
        switch (name) {
            case "contains" -> {
                arity(name, arguments, 2, errors);
                if (!arguments.isEmpty() && !List.of(ValueType.STRING, ValueType.ARRAY).contains(arguments.getFirst())) errors.add("contains yêu cầu đối số đầu là STRING hoặc ARRAY");
                return ValueType.BOOLEAN;
            }
            case "in" -> {
                arity(name, arguments, 2, errors);
                if (arguments.size() >= 2 && !List.of(ValueType.STRING, ValueType.ARRAY).contains(arguments.get(1))) errors.add("in yêu cầu đối số thứ hai là danh sách ARRAY hoặc chuỗi phân cách bằng dấu phẩy");
                return ValueType.BOOLEAN;
            }
            case "matches" -> { arity(name, arguments, 2, errors); arguments.forEach(type -> require(type, ValueType.STRING, name, errors)); return ValueType.BOOLEAN; }
            case "length" -> {
                arity(name, arguments, 1, errors);
                if (!arguments.isEmpty() && !List.of(ValueType.STRING, ValueType.ARRAY, ValueType.OBJECT).contains(arguments.getFirst())) errors.add("length yêu cầu STRING, ARRAY hoặc OBJECT");
                return ValueType.NUMBER;
            }
            case "lower", "upper" -> { arity(name, arguments, 1, errors); if (!arguments.isEmpty()) require(arguments.getFirst(), ValueType.STRING, name, errors); return ValueType.STRING; }
            case "isnull", "isnotnull" -> { arity(name, arguments, 1, errors); return ValueType.BOOLEAN; }
            case "coalesce" -> {
                if (arguments.isEmpty()) errors.add("coalesce cần ít nhất một đối số");
                ValueType result = arguments.stream().filter(type -> type != ValueType.NULL).findFirst().orElse(ValueType.NULL);
                if (arguments.stream().filter(type -> type != ValueType.NULL).anyMatch(type -> type != result)) errors.add("Các đối số non-null của coalesce phải cùng kiểu");
                return result;
            }
            default -> { errors.add("Hàm không nằm trong whitelist: " + rawName); return ValueType.UNKNOWN; }
        }
    }

    private void require(ValueType actual, ValueType expected, String location, List<String> errors) {
        if (actual != expected) errors.add(location + " yêu cầu " + expected + " nhưng nhận " + actual);
    }

    private void arity(String name, List<ValueType> arguments, int expected, List<String> errors) {
        if (arguments.size() != expected) errors.add(name + " yêu cầu " + expected + " đối số");
    }

    private Value evaluate(Node node, Function<String, JsonNode> resolver) {
        if (node instanceof Literal literal) return new Value(literal.type, literal.value);
        if (node instanceof Reference reference) {
            JsonNode value = resolver.apply(reference.path);
            if (value == null || value.isMissingNode()) throw new ExpressionException("Không resolve được ${" + reference.path + "}");
            return fromJson(value);
        }
        if (node instanceof Unary unary) {
            Value operand = evaluate(unary.operand, resolver);
            if ("!".equals(unary.operator)) return new Value(ValueType.BOOLEAN, !booleanValue(operand, unary.operator));
            BigDecimal number = numberValue(operand, unary.operator);
            return new Value(ValueType.NUMBER, "-".equals(unary.operator) ? number.negate() : number);
        }
        if (node instanceof Binary binary) {
            if ("&&".equals(binary.operator)) {
                Value left = evaluate(binary.left, resolver);
                if (!booleanValue(left, "&&")) return new Value(ValueType.BOOLEAN, false);
                return new Value(ValueType.BOOLEAN, booleanValue(evaluate(binary.right, resolver), "&&"));
            }
            if ("||".equals(binary.operator)) {
                Value left = evaluate(binary.left, resolver);
                if (booleanValue(left, "||")) return new Value(ValueType.BOOLEAN, true);
                return new Value(ValueType.BOOLEAN, booleanValue(evaluate(binary.right, resolver), "||"));
            }
            return evaluateBinary(binary.operator, evaluate(binary.left, resolver), evaluate(binary.right, resolver));
        }
        FunctionCall function = (FunctionCall) node;
        return evaluateFunction(function.name, function.arguments.stream().map(argument -> evaluate(argument, resolver)).toList());
    }

    private Value evaluateBinary(String operator, Value left, Value right) {
        if (List.of("+", "-", "*", "/", "%").contains(operator)) {
            BigDecimal a = numberValue(left, operator), b = numberValue(right, operator);
            BigDecimal result = switch (operator) { case "+" -> a.add(b); case "-" -> a.subtract(b); case "*" -> a.multiply(b); case "/" -> a.divide(b, MathContext.DECIMAL128); default -> a.remainder(b); };
            return new Value(ValueType.NUMBER, result);
        }
        if (List.of("==", "!=").contains(operator)) {
            boolean equal = left.type == right.type && Objects.equals(normalizeNumber(left.value), normalizeNumber(right.value)) || left.type == ValueType.NULL && right.type == ValueType.NULL;
            return new Value(ValueType.BOOLEAN, "==".equals(operator) == equal);
        }
        if (left.type != right.type || !List.of(ValueType.NUMBER, ValueType.STRING, ValueType.DATE).contains(left.type)) throw new ExpressionException("Không thể dùng " + operator + " cho " + left.type + " và " + right.type);
        int comparison = left.type == ValueType.NUMBER ? ((BigDecimal) left.value).compareTo((BigDecimal) right.value) : String.valueOf(left.value).compareTo(String.valueOf(right.value));
        return new Value(ValueType.BOOLEAN, switch (operator) { case ">" -> comparison > 0; case ">=" -> comparison >= 0; case "<" -> comparison < 0; case "<=" -> comparison <= 0; default -> false; });
    }

    private Value evaluateFunction(String rawName, List<Value> arguments) {
        String name = rawName.toLowerCase(Locale.ROOT);
        return switch (name) {
            case "contains" -> {
                Value source = arguments.get(0), needle = arguments.get(1);
                if (source.type == ValueType.STRING) yield new Value(ValueType.BOOLEAN, String.valueOf(source.value).contains(String.valueOf(needle.value)));
                if (source.type == ValueType.ARRAY) yield new Value(ValueType.BOOLEAN, ((List<?>) source.value).contains(needle.value));
                throw new ExpressionException("contains yêu cầu STRING hoặc ARRAY");
            }
            case "in" -> {
                Value needle = arguments.get(0), collection = arguments.get(1);
                if (collection.type == ValueType.ARRAY) {
                    yield new Value(ValueType.BOOLEAN, ((List<?>) collection.value).stream()
                            .anyMatch(item -> Objects.equals(normalizeNumber(item), normalizeNumber(needle.value))));
                }
                if (collection.type == ValueType.STRING) {
                    String expected = String.valueOf(needle.value).trim();
                    boolean found = java.util.Arrays.stream(String.valueOf(collection.value).split(","))
                            .map(String::trim).anyMatch(expected::equals);
                    yield new Value(ValueType.BOOLEAN, found);
                }
                throw new ExpressionException("in yêu cầu danh sách ARRAY hoặc chuỗi phân cách bằng dấu phẩy");
            }
            case "matches" -> new Value(ValueType.BOOLEAN, stringValue(arguments.get(0), name).matches(stringValue(arguments.get(1), name)));
            case "length" -> new Value(ValueType.NUMBER, BigDecimal.valueOf(switch (arguments.getFirst().type) { case STRING -> String.valueOf(arguments.getFirst().value).length(); case ARRAY -> ((List<?>) arguments.getFirst().value).size(); case OBJECT -> ((java.util.Map<?, ?>) arguments.getFirst().value).size(); default -> throw new ExpressionException("length yêu cầu STRING, ARRAY hoặc OBJECT"); }));
            case "lower" -> new Value(ValueType.STRING, stringValue(arguments.getFirst(), name).toLowerCase(Locale.ROOT));
            case "upper" -> new Value(ValueType.STRING, stringValue(arguments.getFirst(), name).toUpperCase(Locale.ROOT));
            case "isnull" -> new Value(ValueType.BOOLEAN, arguments.getFirst().type == ValueType.NULL);
            case "isnotnull" -> new Value(ValueType.BOOLEAN, arguments.getFirst().type != ValueType.NULL);
            case "coalesce" -> arguments.stream().filter(value -> value.type != ValueType.NULL).findFirst().orElse(new Value(ValueType.NULL, null));
            default -> throw new ExpressionException("Hàm không nằm trong whitelist: " + rawName);
        };
    }

    private Value fromJson(JsonNode value) {
        if (value.isNull()) return new Value(ValueType.NULL, null);
        if (value.isNumber()) return new Value(ValueType.NUMBER, value.decimalValue());
        if (value.isBoolean()) return new Value(ValueType.BOOLEAN, value.asBoolean());
        if (value.isTextual()) return new Value(ValueType.STRING, value.asText());
        if (value.isArray()) { List<Object> items = new ArrayList<>(); value.forEach(item -> items.add(fromJson(item).value)); return new Value(ValueType.ARRAY, items); }
        return new Value(ValueType.OBJECT, new ObjectMapper().convertValue(value, java.util.Map.class));
    }

    private BigDecimal numberValue(Value value, String operator) { if (value.type != ValueType.NUMBER) throw new ExpressionException(operator + " chỉ áp dụng cho NUMBER, nhận " + value.type); return (BigDecimal) value.value; }
    private boolean booleanValue(Value value, String operator) { if (value.type != ValueType.BOOLEAN) throw new ExpressionException(operator + " chỉ áp dụng cho BOOLEAN, nhận " + value.type); return (Boolean) value.value; }
    private String stringValue(Value value, String function) { if (value.type != ValueType.STRING) throw new ExpressionException(function + " yêu cầu STRING, nhận " + value.type); return String.valueOf(value.value); }
    private Object normalizeNumber(Object value) { return value instanceof BigDecimal number ? number.stripTrailingZeros() : value; }

    private sealed interface Node permits Literal, Reference, Unary, Binary, FunctionCall {}
    private record Literal(ValueType type, Object value) implements Node {}
    private record Reference(String path) implements Node {}
    private record Unary(String operator, Node operand) implements Node {}
    private record Binary(String operator, Node left, Node right) implements Node {}
    private record FunctionCall(String name, List<Node> arguments) implements Node {}
    private record Value(ValueType type, Object value) {}

    private enum TokenType { NUMBER, STRING, REFERENCE, IDENTIFIER, OPERATOR, LEFT, RIGHT, COMMA, END }
    private record Token(TokenType type, String text) {}

    private static final class Parser {
        private final List<Token> tokens;
        private int index;
        Parser(String expression) { this.tokens = tokenize(expression == null ? "" : expression); }
        Node parse() { Node result = or(); if (peek().type != TokenType.END) throw error("Token không mong đợi: " + peek().text); return result; }
        private Node or() { Node node = and(); while (match("||", "OR")) node = new Binary("||", node, and()); return node; }
        private Node and() { Node node = equality(); while (match("&&", "AND")) node = new Binary("&&", node, equality()); return node; }
        private Node equality() { Node node = comparison(); while (match("==", "!=")) { String op = previous().text; node = new Binary(op, node, comparison()); } return node; }
        private Node comparison() { Node node = term(); while (match(">", ">=", "<", "<=")) { String op = previous().text; node = new Binary(op, node, term()); } return node; }
        private Node term() { Node node = factor(); while (match("+", "-")) { String op = previous().text; node = new Binary(op, node, factor()); } return node; }
        private Node factor() { Node node = unary(); while (match("*", "/", "%")) { String op = previous().text; node = new Binary(op, node, unary()); } return node; }
        private Node unary() { if (match("!", "NOT", "+", "-")) { String op = previous().text; return new Unary("NOT".equalsIgnoreCase(op) ? "!" : op, unary()); } return primary(); }
        private Node primary() {
            Token token = advance();
            if (token.type == TokenType.NUMBER) return new Literal(ValueType.NUMBER, new BigDecimal(token.text));
            if (token.type == TokenType.STRING) return new Literal(ValueType.STRING, token.text);
            if (token.type == TokenType.REFERENCE) return new Reference(token.text.trim());
            if (token.type == TokenType.IDENTIFIER) {
                if ("true".equalsIgnoreCase(token.text)) return new Literal(ValueType.BOOLEAN, true);
                if ("false".equalsIgnoreCase(token.text)) return new Literal(ValueType.BOOLEAN, false);
                if ("null".equalsIgnoreCase(token.text)) return new Literal(ValueType.NULL, null);
                if (peek().type != TokenType.LEFT) throw error("Identifier phải là hàm whitelist hoặc literal: " + token.text);
                advance(); List<Node> arguments = new ArrayList<>();
                if (peek().type != TokenType.RIGHT) do { arguments.add(or()); } while (consume(TokenType.COMMA));
                expect(TokenType.RIGHT, "Thiếu ')' sau lời gọi hàm");
                return new FunctionCall(token.text, List.copyOf(arguments));
            }
            if (token.type == TokenType.LEFT) { Node nested = or(); expect(TokenType.RIGHT, "Thiếu ')'"); return nested; }
            throw error("Thiếu toán hạng");
        }
        private boolean match(String... values) { for (String value : values) if (peek().text.equalsIgnoreCase(value)) { advance(); return true; } return false; }
        private boolean consume(TokenType type) { if (peek().type == type) { advance(); return true; } return false; }
        private void expect(TokenType type, String message) { if (!consume(type)) throw error(message); }
        private Token advance() { if (index < tokens.size()) index++; return previous(); }
        private Token previous() { return tokens.get(index - 1); }
        private Token peek() { return tokens.get(index); }
        private ExpressionException error(String message) { return new ExpressionException(message + " tại token " + index); }

        private static List<Token> tokenize(String input) {
            List<Token> result = new ArrayList<>(); int cursor = 0;
            while (cursor < input.length()) {
                char ch = input.charAt(cursor);
                if (Character.isWhitespace(ch)) { cursor++; continue; }
                if (ch == '$' && cursor + 1 < input.length() && input.charAt(cursor + 1) == '{') {
                    int end = input.indexOf('}', cursor + 2); if (end < 0) throw new ExpressionException("Tham chiếu thiếu '}'");
                    result.add(new Token(TokenType.REFERENCE, input.substring(cursor + 2, end))); cursor = end + 1; continue;
                }
                if (ch == '\'' || ch == '"') {
                    char quote = ch; StringBuilder value = new StringBuilder(); cursor++; boolean closed = false;
                    while (cursor < input.length()) { char current = input.charAt(cursor++); if (current == quote) { closed = true; break; } if (current == '\\' && cursor < input.length()) current = input.charAt(cursor++); value.append(current); }
                    if (!closed) throw new ExpressionException("Chuỗi literal chưa đóng"); result.add(new Token(TokenType.STRING, value.toString())); continue;
                }
                if (Character.isDigit(ch) || ch == '.' && cursor + 1 < input.length() && Character.isDigit(input.charAt(cursor + 1))) {
                    int start = cursor++; while (cursor < input.length() && (Character.isDigit(input.charAt(cursor)) || input.charAt(cursor) == '.')) cursor++;
                    result.add(new Token(TokenType.NUMBER, input.substring(start, cursor))); continue;
                }
                if (Character.isLetter(ch) || ch == '_') {
                    int start = cursor++; while (cursor < input.length() && (Character.isLetterOrDigit(input.charAt(cursor)) || input.charAt(cursor) == '_')) cursor++;
                    result.add(new Token(TokenType.IDENTIFIER, input.substring(start, cursor))); continue;
                }
                if (ch == '(') { result.add(new Token(TokenType.LEFT, "(")); cursor++; continue; }
                if (ch == ')') { result.add(new Token(TokenType.RIGHT, ")")); cursor++; continue; }
                if (ch == ',') { result.add(new Token(TokenType.COMMA, ",")); cursor++; continue; }
                String two = cursor + 1 < input.length() ? input.substring(cursor, cursor + 2) : "";
                if (List.of("==", "!=", ">=", "<=", "&&", "||").contains(two)) { result.add(new Token(TokenType.OPERATOR, two)); cursor += 2; continue; }
                if ("+-*/%><!".indexOf(ch) >= 0) { result.add(new Token(TokenType.OPERATOR, String.valueOf(ch))); cursor++; continue; }
                throw new ExpressionException("Ký tự không được hỗ trợ: " + ch);
            }
            result.add(new Token(TokenType.END, "<EOF>")); return result;
        }
    }

    private static final class ExpressionException extends RuntimeException { ExpressionException(String message) { super(message); } }
}
