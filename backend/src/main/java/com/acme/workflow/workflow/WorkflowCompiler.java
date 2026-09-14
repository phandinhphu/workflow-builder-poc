package com.acme.workflow.workflow;

import com.acme.workflow.runtime.ExpressionEngine;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class WorkflowCompiler {
    private static final Pattern TEMPLATE_REFERENCE = Pattern.compile("\\$\\{([^}]+)}");
    private final ExpressionEngine expressions = new ExpressionEngine();
    public static final Set<String> SUPPORTED_TYPES = Set.of(
            "START", "END", "ASSIGNMENT", "APPROVAL", "REVIEW", "CONDITION",
            "NOTIFICATION", "SYSTEM", "HTTP", "DATA", "DATA_TRANSFORM", "TIMER",
            "WAIT_EVENT", "PARALLEL_SPLIT", "JOIN", "SUBWORKFLOW");
    private static final Set<String> HUMAN_TYPES = Set.of("ASSIGNMENT", "APPROVAL", "REVIEW");
    private static final Set<String> TRIGGERS = Set.of("manual", "schedule", "form", "webhook");
    private static final Set<String> RESOLVERS = Set.of("fixed", "fixed_user", "role", "group", "current_participant",
            "participant_manager", "creator_manager", "manager_of", "department_head", "dynamic", "initiator", "creator",
            // Per-participant dynamic resolution types
            "each_participant_manager", "each_participant");
    private static final Map<String, Set<String>> PORTS = Map.ofEntries(
            Map.entry("START", Set.of("SUCCESS", "STARTED")),
            Map.entry("ASSIGNMENT", Set.of("SUCCESS", "REJECTED", "REQUEST_CHANGE", "TIMEOUT", "ERROR")),
            Map.entry("APPROVAL", Set.of("APPROVED", "REJECTED", "REQUEST_CHANGE", "TIMEOUT", "ERROR")),
            Map.entry("REVIEW", Set.of("REVIEW_COMPLETED", "REJECTED", "REQUEST_CHANGE", "TIMEOUT", "ERROR")),
            Map.entry("CONDITION", Set.of("TRUE", "FALSE")),
            Map.entry("NOTIFICATION", Set.of("SUCCESS", "ERROR")),
            Map.entry("SYSTEM", Set.of("SUCCESS", "ERROR")),
            Map.entry("HTTP", Set.of("SUCCESS", "ERROR")),
            Map.entry("DATA", Set.of("SUCCESS", "ERROR")),
            Map.entry("DATA_TRANSFORM", Set.of("SUCCESS", "ERROR")),
            Map.entry("TIMER", Set.of("TIMEOUT", "SUCCESS")),
            Map.entry("WAIT_EVENT", Set.of("RECEIVED", "TIMEOUT", "SUCCESS")),
            Map.entry("JOIN", Set.of("JOINED", "SUCCESS")),
            Map.entry("SUBWORKFLOW", Set.of("COMPLETED", "SUCCESS", "ERROR")));

    public Map<String, Object> validate(JsonNode definition) {
        List<Map<String, Object>> errors = new ArrayList<>();
        List<Map<String, Object>> warnings = new ArrayList<>();
        requiredText(definition, "name", "WF_NAME_REQUIRED", "Workflow cần có tên", errors);
        validateTrigger(definition.path("trigger"), errors);
        validateVariables(definition.path("variables"), errors);

        JsonNode nodes = definition.path("nodes");
        JsonNode connections = definition.path("connections");
        if (!nodes.isArray() || nodes.isEmpty()) error(errors, "NODE_REQUIRED", "Workflow cần có node", null, null);
        if (!connections.isArray()) error(errors, "CONNECTIONS_INVALID", "connections phải là một mảng", null, null);

        Map<String, JsonNode> byId = new LinkedHashMap<>();
        Map<String, String> typeById = new HashMap<>();
        if (nodes.isArray()) for (JsonNode node : nodes) {
            String id = node.path("id").asText();
            if (id.isBlank()) { error(errors, "NODE_ID_REQUIRED", "Node thiếu id", null, null); continue; }
            if (byId.put(id, node) != null) error(errors, "DUPLICATE_NODE_ID", "Trùng node id " + id, id, null);
            String type = node.path("type").asText().toUpperCase(Locale.ROOT); typeById.put(id, type);
            validateNode(node, type, errors, warnings);
        }

        List<String> starts = typeById.entrySet().stream().filter(e -> "START".equals(e.getValue())).map(Map.Entry::getKey).toList();
        List<String> ends = typeById.entrySet().stream().filter(e -> "END".equals(e.getValue())).map(Map.Entry::getKey).toList();
        if (starts.size() != 1) error(errors, "EXACTLY_ONE_START", "Workflow phải có đúng một START node", null, null);
        if (ends.isEmpty()) error(errors, "END_REQUIRED", "Workflow phải có ít nhất một END node", null, null);

        Map<String, List<String>> graph = new HashMap<>();
        Map<String, List<String>> reverse = new HashMap<>();
        Set<String> connectionIds = new HashSet<>();
        Set<String> edgeKeys = new HashSet<>();
        if (connections.isArray()) for (JsonNode connection : connections) {
            String id = connection.path("id").asText();
            String source = connection.path("sourceNodeId").asText();
            String target = connection.path("targetNodeId").asText();
            String port = connection.path("sourcePort").asText().toUpperCase(Locale.ROOT);
            if (id.isBlank() || !connectionIds.add(id)) error(errors, "CONNECTION_ID_INVALID", "Connection id thiếu hoặc bị trùng", null, id);
            if (!byId.containsKey(source)) error(errors, "SOURCE_NOT_FOUND", "Không tìm thấy source node " + source, source, id);
            if (!byId.containsKey(target)) error(errors, "TARGET_NOT_FOUND", "Không tìm thấy target node " + target, target, id);
            if (source.equals(target)) error(errors, "SELF_CONNECTION", "Node không được nối trực tiếp vào chính nó", source, id);
            if ("END".equals(typeById.get(source))) error(errors, "END_HAS_OUTPUT", "END node không được có outgoing connection", source, id);
            if ("START".equals(typeById.get(target))) error(errors, "START_HAS_INPUT", "START node không được có incoming connection", target, id);
            if (port.isBlank()) error(errors, "SOURCE_PORT_REQUIRED", "Connection cần sourcePort", source, id);
            else if (!isValidPort(typeById.get(source), port)) error(errors, "INVALID_SOURCE_PORT", "Port " + port + " không hợp lệ cho " + typeById.get(source), source, id);
            String edgeKey = source + "|" + port + "|" + target;
            if (!edgeKeys.add(edgeKey)) error(errors, "DUPLICATE_CONNECTION", "Connection bị trùng", source, id);
            graph.computeIfAbsent(source, ignored -> new ArrayList<>()).add(target);
            reverse.computeIfAbsent(target, ignored -> new ArrayList<>()).add(source);
        }

        validateBindings(definition, byId, graph, errors, warnings);

        if (starts.size() == 1) {
            String start = starts.getFirst();
            if (graph.getOrDefault(start, List.of()).size() != 1) error(errors, "START_OUTGOING", "START node phải có đúng một outgoing connection", start, null);
            Set<String> reachable = reachable(start, graph);
            byId.keySet().stream().filter(id -> !reachable.contains(id)).forEach(id -> error(errors, "UNREACHABLE_NODE", "Node không thể đi tới từ START: " + id, id, null));
        }
        Set<String> canReachEnd = new HashSet<>();
        ends.forEach(end -> visit(end, reverse, canReachEnd));
        byId.keySet().stream().filter(id -> !canReachEnd.contains(id)).forEach(id -> error(errors, "NO_PATH_TO_END", "Node không có đường đi tới END: " + id, id, null));

        boolean hasCycle = hasCycle(byId.keySet(), graph);
        if (hasCycle && definition.path("settings").path("maxIterations").asInt(0) <= 0)
            error(errors, "CYCLE_POLICY_REQUIRED", "Workflow có loop nên phải cấu hình settings.maxIterations > 0", null, null);
        if (definition.path("settings").path("maxIterations").asInt(100) > 1000)
            error(errors, "MAX_ITERATIONS_TOO_HIGH", "maxIterations không được vượt 1000", null, null);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("nodeCount", byId.size()); stats.put("connectionCount", connections.isArray() ? connections.size() : 0);
        stats.put("startNodeId", starts.size() == 1 ? starts.getFirst() : null); stats.put("endNodeIds", ends); stats.put("hasCycle", hasCycle);
        Map<String, Object> report = new LinkedHashMap<>(); report.put("valid", errors.isEmpty());
        report.put("errors", errors); report.put("warnings", warnings); report.put("stats", stats); report.put("compiledAt", Instant.now().toString());
        report.put("runtimeCapabilityVersion", "2.0"); return report;
    }

    private void validateTrigger(JsonNode trigger, List<Map<String, Object>> errors) {
        if (!trigger.isObject()) { error(errors, "TRIGGER_REQUIRED", "Workflow cần có trigger", null, null); return; }
        String type = trigger.path("type").asText().toLowerCase(Locale.ROOT);
        if (!TRIGGERS.contains(type)) { error(errors, "TRIGGER_UNSUPPORTED", "Trigger không được hỗ trợ: " + type, null, null); return; }
        JsonNode config = trigger.path("config");
        if ("schedule".equals(type)) {
            String cron = config.path("cron").asText();
            try { CronExpression.parse(cron); } catch (RuntimeException error) { error(errors, "INVALID_CRON", "Cron schedule không hợp lệ", null, null); }
            try { ZoneId.of(config.path("timezone").asText("Asia/Bangkok")); } catch (RuntimeException error) { error(errors, "INVALID_TIMEZONE", "Timezone không hợp lệ", null, null); }
        }
        if ("form".equals(type) && !config.path("formFields").isArray() && config.path("formRef").asText().isBlank())
            error(errors, "TRIGGER_FORM_REQUIRED", "Form trigger cần formFields hoặc formRef", null, null);
        if ("webhook".equals(type) && config.path("secretReference").asText().isBlank())
            error(errors, "WEBHOOK_SECRET_REQUIRED", "Webhook trigger cần secretReference", null, null);
    }

    private void validateVariables(JsonNode variables, List<Map<String, Object>> errors) {
        if (!variables.isArray()) { error(errors, "VARIABLES_INVALID", "variables phải là mảng", null, null); return; }
        Set<String> keys = new HashSet<>();
        variables.forEach(variable -> {
            String key = variable.path("key").asText();
            if (key.isBlank() || !key.matches("[A-Za-z_][A-Za-z0-9_]*")) error(errors, "VARIABLE_KEY_INVALID", "Variable key không hợp lệ: " + key, null, null);
            else if (!keys.add(key)) error(errors, "DUPLICATE_VARIABLE", "Trùng variable key " + key, null, null);
            if (!Set.of("STRING", "NUMBER", "BOOLEAN", "DATE", "OBJECT", "ARRAY").contains(variable.path("dataType").asText()))
                error(errors, "VARIABLE_TYPE_INVALID", "Variable dataType không hợp lệ: " + key, null, null);
        });
    }

    private void validateNode(JsonNode node, String type, List<Map<String, Object>> errors, List<Map<String, Object>> warnings) {
        String id = node.path("id").asText(); requiredText(node, "name", "NODE_NAME_REQUIRED", "Node cần có tên", errors);
        if (!SUPPORTED_TYPES.contains(type)) { error(errors, "NODE_TYPE_UNSUPPORTED", "Runtime chưa hỗ trợ node type " + type, id, null); return; }
        JsonNode config = node.path("config");
        if (HUMAN_TYPES.contains(type)) {
            JsonNode assignee = config.has("assigneeResolver") ? config.path("assigneeResolver") : config.path("assignee");
            validateAssignee(id, assignee, errors); validateForm(id, config.path("formFields"), errors);
            String mode = config.path("assignmentMode").asText(config.path("executionMode").asText("DIRECT_ONE")).toUpperCase(Locale.ROOT);
            if (!Set.of("DIRECT_ONE", "DIRECT_ALL", "CLAIMABLE_POOL", "SINGLE", "ALL", "FOREACHPARTICIPANT", "FOR_EACH_PARTICIPANT", "DYNAMIC_BATCH").contains(mode)) error(errors, "ASSIGNMENT_MODE_INVALID", "assignmentMode không hợp lệ", id, null);
            validateDuration(id, config.path("slaConfig").path("dueIn").asText(config.path("slaDue").asText()), false, errors);
        }
        if ("CONDITION".equals(type)) {
            boolean hasStructuredRules = (config.has("rules") && config.path("rules").isArray() && !config.path("rules").isEmpty())
                    || (config.path("condition").isObject() && config.path("condition").has("rules") && !config.path("condition").path("rules").isEmpty());
            if (hasStructuredRules) {
                JsonNode rules = config.has("rules") ? config.path("rules") : config.path("condition").path("rules");
                for (JsonNode rule : rules) {
                    if (rule.path("field").asText("").isBlank()) {
                        error(errors, "CONDITION_FIELD_REQUIRED", "Mỗi rule trong Condition node cần có field", id, null);
                    }
                    if (rule.path("operator").asText("").isBlank()) {
                        error(errors, "CONDITION_OPERATOR_REQUIRED", "Mỗi rule trong Condition node cần có operator", id, null);
                    }
                }
            } else if (config.path("condition").asText(config.path("expression").asText()).isBlank()) {
                error(errors, "CONDITION_REQUIRED", "Condition node cần biểu thức hoặc danh sách rules", id, null);
            }
        }
        if ("NOTIFICATION".equals(type)) { validateAssignee(id, config.path("assignee"), errors); if (!config.path("channels").isArray() || config.path("channels").isEmpty()) error(errors, "NOTIFICATION_CHANNEL_REQUIRED", "Notification cần ít nhất một channel", id, null); }
        if ("TIMER".equals(type)) validateDuration(id, config.path("duration").asText(config.path("waitFor").asText()), true, errors);
        if ("WAIT_EVENT".equals(type)) {
            if (config.path("eventName").asText().isBlank()) error(errors, "WAIT_EVENT_NAME_REQUIRED", "Wait Event cần eventName", id, null);
            if (config.path("correlationKey").asText().isBlank()) error(errors, "WAIT_CORRELATION_REQUIRED", "Wait Event cần correlationKey", id, null);
            validateDuration(id, config.path("timeout").asText(), false, errors);
        }
        if ("PARALLEL_SPLIT".equals(type) && config.path("branchCount").asInt(0) < 2) warning(warnings, "PARALLEL_BRANCH_INFERRED", "branchCount sẽ được suy ra từ outgoing connections", id);
        if ("JOIN".equals(type) && !Set.of("ALL", "ANY", "THRESHOLD").contains(config.path("joinPolicy").asText("ALL").toUpperCase(Locale.ROOT))) error(errors, "JOIN_POLICY_INVALID", "joinPolicy không hợp lệ", id, null);
        if ("SUBWORKFLOW".equals(type) && config.path("workflowRef").asText().isBlank()) error(errors, "SUBWORKFLOW_REF_REQUIRED", "Subworkflow cần workflowRef", id, null);
    }

    private void validateAssignee(String id, JsonNode assignee, List<Map<String, Object>> errors) {
        if (!assignee.isObject()) { error(errors, "ASSIGNEE_REQUIRED", "Node cần assignee resolver", id, null); return; }
        String type = assignee.path("type").asText().toLowerCase(Locale.ROOT);
        if (!RESOLVERS.contains(type)) error(errors, "ASSIGNEE_TYPE_UNSUPPORTED", "Assignee resolver không hỗ trợ: " + type, id, null);
        if (Set.of("fixed", "fixed_user", "role", "group", "dynamic").contains(type) && assignee.path("value").asText().isBlank()) error(errors, "ASSIGNEE_VALUE_REQUIRED", "Assignee resolver " + type + " cần value", id, null);
    }

    private void validateForm(String id, JsonNode fields, List<Map<String, Object>> errors) {
        if (!fields.isArray()) return;
        Set<String> ids = new HashSet<>(), outputs = new HashSet<>();
        fields.forEach(field -> {
            String fieldId = field.path("id").asText(), output = field.path("outputMapping").asText(fieldId);
            if (fieldId.isBlank() || !ids.add(fieldId)) error(errors, "FORM_FIELD_ID_INVALID", "Form field id thiếu hoặc bị trùng", id, null);
            if (output.isBlank() || !outputs.add(output)) error(errors, "FORM_OUTPUT_INVALID", "Form outputMapping thiếu hoặc bị trùng: " + output, id, null);
            if (!Set.of("text", "textarea", "number", "date", "select", "radio", "checkbox", "user", "user_picker", "user-picker", "file").contains(field.path("type").asText().toLowerCase(Locale.ROOT))) error(errors, "FORM_FIELD_TYPE_INVALID", "Form field type không được hỗ trợ", id, null);
        });
    }

    private void validateBindings(JsonNode definition, Map<String, JsonNode> nodes, Map<String, List<String>> graph,
                                  List<Map<String, Object>> errors, List<Map<String, Object>> warnings) {
        Set<String> variables = new HashSet<>();
        definition.path("variables").forEach(variable -> variables.add(variable.path("key").asText()));
        Set<String> reported = new HashSet<>();
        nodes.forEach((nodeId, node) -> collectReferences(node, reference -> {
            String path = normalizeReference(reference);
            if (path.isBlank() || !reported.add(nodeId + "|" + path)) return;
            String[] parts = path.split("\\.");
            String root = parts[0];
            if (parts.length == 1 && variables.contains(root)) {
                warning(warnings, "VARIABLE_NAMESPACE_IMPLICIT", "Nên đổi ${" + root + "} thành ${variables." + root + "}", nodeId);
                return;
            }
            if ("variables".equals(root)) {
                if (parts.length < 2 || !variables.contains(parts[1]))
                    error(errors, "BINDING_VARIABLE_NOT_FOUND", "Không tìm thấy workflow variable: " + path, nodeId, null);
                return;
            }
            if ("nodes".equals(root)) {
                validateNodeBinding(path, parts, nodeId, nodes, graph, errors, warnings);
                return;
            }
            if (!Set.of("trigger", "instance", "participant", "currentUser").contains(root))
                error(errors, "BINDING_ROOT_UNSUPPORTED", "Namespace context không được hỗ trợ: " + root, nodeId, null);
        }));
        nodes.forEach((nodeId, node) -> validateTypedExpressions(definition, nodeId, node, nodes, errors));
    }

    private void validateTypedExpressions(JsonNode definition, String nodeId, JsonNode node, Map<String, JsonNode> nodes,
                                          List<Map<String, Object>> errors) {
        JsonNode config = node.path("config");
        Set<String> checked = new HashSet<>();
        if ("CONDITION".equalsIgnoreCase(node.path("type").asText())) {
            boolean hasStructuredRules = (config.has("rules") && config.path("rules").isArray())
                    || (config.path("condition").isObject() && config.path("condition").has("rules"));
            if (!hasStructuredRules) {
                String condition = config.path("condition").asText(config.path("expression").asText());
                validateExpression(definition, nodes, nodeId, condition, ExpressionEngine.ValueType.BOOLEAN, "condition", checked, errors);
            }
        }
        config.path("formFields").forEach(field -> {
            ExpressionEngine.ValueType fieldType = formType(field.path("type").asText());
            if (field.has("defaultValue")) validateExpressionValue(definition, nodes, nodeId, field.get("defaultValue"), fieldType, "formFields." + field.path("id").asText() + ".defaultValue", checked, errors);
            if (field.has("visibleWhen")) validateExpressionValue(definition, nodes, nodeId, field.get("visibleWhen"), ExpressionEngine.ValueType.BOOLEAN, "formFields." + field.path("id").asText() + ".visibleWhen", checked, errors);
            if (field.has("readOnlyWhen")) validateExpressionValue(definition, nodes, nodeId, field.get("readOnlyWhen"), ExpressionEngine.ValueType.BOOLEAN, "formFields." + field.path("id").asText() + ".readOnlyWhen", checked, errors);
            if (field.path("validation").has("expression")) validateExpressionValue(definition, nodes, nodeId, field.path("validation").get("expression"), ExpressionEngine.ValueType.BOOLEAN, "formFields." + field.path("id").asText() + ".validation.expression", checked, errors);
        });
        collectExpressionBindings(config, expression -> validateExpression(definition, nodes, nodeId, expression, ExpressionEngine.ValueType.UNKNOWN, "ValueBinding.EXPRESSION", checked, errors));
        collectInlineExpressions(config, expression -> validateExpression(definition, nodes, nodeId, expression, ExpressionEngine.ValueType.UNKNOWN, "inline expression", checked, errors));
    }

    private void validateExpressionValue(JsonNode definition, Map<String, JsonNode> nodes, String nodeId, JsonNode value,
                                         ExpressionEngine.ValueType expected, String location, Set<String> checked,
                                         List<Map<String, Object>> errors) {
        if (value == null) return;
        if (value.isObject() && "EXPRESSION".equalsIgnoreCase(value.path("kind").asText())) validateExpression(definition, nodes, nodeId, value.path("expression").asText(), expected, location, checked, errors);
        else if (value.isTextual() && (expressions.looksLikeExpression(value.asText()) || TEMPLATE_REFERENCE.matcher(value.asText()).matches())) validateExpression(definition, nodes, nodeId, value.asText(), expected, location, checked, errors);
    }

    private void validateExpression(JsonNode definition, Map<String, JsonNode> nodes, String nodeId, String expression,
                                    ExpressionEngine.ValueType expected, String location, Set<String> checked,
                                    List<Map<String, Object>> errors) {
        if (expression == null || expression.isBlank() || !checked.add(expression + "|" + expected)) return;
        String value = expression.trim();
        Matcher exact = TEMPLATE_REFERENCE.matcher(value);
        ExpressionEngine.Analysis analysis;
        if (exact.matches()) {
            ExpressionEngine.ValueType type = contextType(definition, nodes, exact.group(1));
            analysis = new ExpressionEngine.Analysis(type != ExpressionEngine.ValueType.UNKNOWN, type,
                    type == ExpressionEngine.ValueType.UNKNOWN ? List.of("Không xác định được kiểu của ${" + exact.group(1) + "}") : List.of(), List.of(exact.group(1)));
        } else analysis = expressions.analyze(value, path -> contextType(definition, nodes, path));
        analysis.errors().forEach(message -> error(errors, "EXPRESSION_TYPE_INVALID", location + ": " + message, nodeId, null));
        if (analysis.valid() && expected != ExpressionEngine.ValueType.UNKNOWN && analysis.type() != expected)
            error(errors, "EXPRESSION_RESULT_TYPE_INVALID", location + " yêu cầu " + expected + " nhưng expression trả " + analysis.type(), nodeId, null);
    }

    private ExpressionEngine.ValueType contextType(JsonNode definition, Map<String, JsonNode> nodes, String rawPath) {
        String path = normalizeReference(rawPath); String[] parts = path.split("\\.");
        if (parts.length == 1) {
            for (JsonNode variable : definition.path("variables")) if (parts[0].equals(variable.path("key").asText())) return declaredType(variable.path("dataType").asText());
            return ExpressionEngine.ValueType.UNKNOWN;
        }
        if ("variables".equals(parts[0])) {
            for (JsonNode variable : definition.path("variables")) if (parts[1].equals(variable.path("key").asText())) return declaredType(variable.path("dataType").asText());
            return ExpressionEngine.ValueType.UNKNOWN;
        }
        if ("nodes".equals(parts[0]) && parts.length >= 3) {
            JsonNode source = nodes.get(parts[1]); if (source == null) return ExpressionEngine.ValueType.UNKNOWN;
            String key = parts.length >= 4 && "output".equals(parts[2]) ? parts[3] : parts[2];
            // Built-in output field type inference
            if ("approved".equalsIgnoreCase(key) || "reviewed".equalsIgnoreCase(key)) return ExpressionEngine.ValueType.BOOLEAN;
            if ("result".equalsIgnoreCase(key) && "CONDITION".equalsIgnoreCase(source.path("type").asText())) return ExpressionEngine.ValueType.BOOLEAN;
            if ("totalParticipants".equalsIgnoreCase(key) || "totalSubmissions".equalsIgnoreCase(key)) return ExpressionEngine.ValueType.NUMBER;
            if ("participantIds".equalsIgnoreCase(key) || "participants".equalsIgnoreCase(key) || "submissionList".equalsIgnoreCase(key)) return ExpressionEngine.ValueType.ARRAY;
            if ("outcome".equalsIgnoreCase(key) || "comment".equalsIgnoreCase(key) || "approverId".equalsIgnoreCase(key) || "reviewerId".equalsIgnoreCase(key)) return ExpressionEngine.ValueType.STRING;
            if ("submissions".equalsIgnoreCase(key)) return ExpressionEngine.ValueType.OBJECT;

            for (JsonNode field : source.path("config").path("formFields")) if (key.equals(field.path("outputMapping").asText(field.path("id").asText()))) return formType(field.path("type").asText());
            JsonNode schema = source.path("outputSchema").path("properties").path(key);
            if (schema.isMissingNode()) schema = source.path("config").path("outputSchema").path("properties").path(key);
            return declaredType(schema.path("type").asText());
        }
        if ("participant".equals(parts[0]) || "currentUser".equals(parts[0])) return Set.of("id", "name", "displayName", "email", "departmentId", "organizationUnitId", "managerId").contains(parts[1]) ? ExpressionEngine.ValueType.STRING : ExpressionEngine.ValueType.UNKNOWN;
        if ("instance".equals(parts[0])) return Set.of("id", "requestCode", "workflowId", "workflowVersionId", "creatorId", "status", "startedAt").contains(parts[1]) ? ExpressionEngine.ValueType.STRING : ExpressionEngine.ValueType.UNKNOWN;
        if ("trigger".equals(parts[0])) {
            String key = parts[parts.length - 1];
            for (JsonNode field : definition.path("trigger").path("config").path("formFields")) if (key.equals(field.path("outputMapping").asText(field.path("id").asText()))) return formType(field.path("type").asText());
        }
        return ExpressionEngine.ValueType.UNKNOWN;
    }

    private ExpressionEngine.ValueType formType(String type) { return switch (type.toLowerCase(Locale.ROOT)) { case "number", "integer" -> ExpressionEngine.ValueType.NUMBER; case "checkbox", "boolean" -> ExpressionEngine.ValueType.BOOLEAN; case "date" -> ExpressionEngine.ValueType.DATE; case "file" -> ExpressionEngine.ValueType.OBJECT; default -> ExpressionEngine.ValueType.STRING; }; }
    private ExpressionEngine.ValueType declaredType(String type) { return switch (type.toUpperCase(Locale.ROOT)) { case "NUMBER", "INTEGER" -> ExpressionEngine.ValueType.NUMBER; case "BOOLEAN" -> ExpressionEngine.ValueType.BOOLEAN; case "DATE", "DATETIME" -> ExpressionEngine.ValueType.DATE; case "OBJECT" -> ExpressionEngine.ValueType.OBJECT; case "ARRAY", "LIST" -> ExpressionEngine.ValueType.ARRAY; case "STRING" -> ExpressionEngine.ValueType.STRING; default -> ExpressionEngine.ValueType.UNKNOWN; }; }

    private void collectExpressionBindings(JsonNode value, java.util.function.Consumer<String> consumer) {
        if (value == null || value.isNull()) return;
        if (value.isObject() && "EXPRESSION".equalsIgnoreCase(value.path("kind").asText())) consumer.accept(value.path("expression").asText());
        value.elements().forEachRemaining(child -> collectExpressionBindings(child, consumer));
    }

    private void collectInlineExpressions(JsonNode value, java.util.function.Consumer<String> consumer) {
        if (value == null || value.isNull()) return;
        if (value.isTextual() && expressions.looksLikeExpression(value.asText())) consumer.accept(value.asText());
        else value.elements().forEachRemaining(child -> collectInlineExpressions(child, consumer));
    }

    private void validateNodeBinding(String path, String[] parts, String currentNodeId, Map<String, JsonNode> nodes,
                                     Map<String, List<String>> graph, List<Map<String, Object>> errors,
                                     List<Map<String, Object>> warnings) {
        if (parts.length < 3) { error(errors, "BINDING_PATH_INVALID", "Binding node không đầy đủ: " + path, currentNodeId, null); return; }
        String referencedNodeId = parts[1];
        JsonNode referencedNode = nodes.get(referencedNodeId);
        if (referencedNode == null) { error(errors, "BINDING_NODE_NOT_FOUND", "Không tìm thấy node được tham chiếu: " + referencedNodeId, currentNodeId, null); return; }
        if (currentNodeId.equals(referencedNodeId) || !reachable(referencedNodeId, graph).contains(currentNodeId)) {
            error(errors, "BINDING_NODE_NOT_UPSTREAM", "Chỉ được tham chiếu output của bước chạy trước: " + referencedNodeId, currentNodeId, null);
            return;
        }
        boolean canonical = parts.length >= 4 && "output".equals(parts[2]);
        String outputKey = canonical ? parts[3] : parts[2];
        if (!canonical) warning(warnings, "LEGACY_NODE_BINDING", "Nên đổi ${" + path + "} thành ${nodes." + referencedNodeId + ".output." + outputKey + "}", currentNodeId);
        Set<String> outputs = new HashSet<>();
        // Built-in system outputs by node type
        String refType = referencedNode.path("type").asText().toUpperCase(Locale.ROOT);
        Set<String> builtInOutputs = switch (refType) {
            case "ASSIGNMENT" -> Set.of("participantIds", "participants", "totalParticipants", "output");
            case "APPROVAL" -> Set.of("approved", "outcome", "comment", "approverId", "action", "output");
            case "REVIEW" -> Set.of("reviewed", "outcome", "comment", "reviewerId", "action", "output");
            case "CONDITION" -> Set.of("result", "output");
            default -> Set.of("output");
        };
        outputs.addAll(builtInOutputs);
        referencedNode.path("config").path("formFields").forEach(field -> outputs.add(field.path("outputMapping").asText(field.path("id").asText())));
        referencedNode.path("config").path("outputSchema").fieldNames().forEachRemaining(outputs::add);
        referencedNode.path("outputSchema").path("properties").fieldNames().forEachRemaining(outputs::add);
        if (!outputs.isEmpty() && !outputs.contains(outputKey))
            error(errors, "BINDING_OUTPUT_NOT_FOUND", "Node " + referencedNodeId + " (" + refType + ") không khai báo output " + outputKey, currentNodeId, null);
    }

    private void collectReferences(JsonNode value, java.util.function.Consumer<String> consumer) {
        if (value == null || value.isNull()) return;
        if (value.isTextual()) {
            Matcher matcher = TEMPLATE_REFERENCE.matcher(value.asText());
            while (matcher.find()) consumer.accept(matcher.group(1));
            return;
        }
        if (value.isObject() && "REFERENCE".equalsIgnoreCase(value.path("kind").asText()) && value.path("path").isTextual())
            consumer.accept(value.path("path").asText());
        value.elements().forEachRemaining(child -> collectReferences(child, consumer));
    }

    private String normalizeReference(String reference) {
        String path = reference == null ? "" : reference.trim();
        if (path.startsWith("$.")) path = path.substring(2);
        return path.replaceAll("\\[['\"]?([^'\"\\]]+)['\"]?]", ".$1");
    }

    private void validateDuration(String nodeId, String value, boolean required, List<Map<String, Object>> errors) {
        if (value == null || value.isBlank()) { if (required) error(errors, "DURATION_REQUIRED", "Node cần duration ISO-8601, ví dụ PT30M hoặc P2D", nodeId, null); return; }
        try { Duration.parse(value); } catch (RuntimeException first) { try { Period.parse(value); } catch (RuntimeException second) { error(errors, "DURATION_INVALID", "Duration phải theo ISO-8601, ví dụ PT30M hoặc P2D", nodeId, null); } }
    }

    private boolean isValidPort(String type, String port) { return "PARALLEL_SPLIT".equals(type) ? port.startsWith("BRANCH_") : PORTS.getOrDefault(type, Set.of()).contains(port); }
    private Set<String> reachable(String start, Map<String, List<String>> graph) { Set<String> result = new HashSet<>(); visit(start, graph, result); return result; }
    private void visit(String node, Map<String, List<String>> graph, Set<String> seen) { if (!seen.add(node)) return; graph.getOrDefault(node, List.of()).forEach(next -> visit(next, graph, seen)); }
    private boolean hasCycle(Collection<String> nodes, Map<String, List<String>> graph) { Set<String> visited = new HashSet<>(), active = new HashSet<>(); for (String node : nodes) if (cycle(node, graph, visited, active)) return true; return false; }
    private boolean cycle(String node, Map<String, List<String>> graph, Set<String> visited, Set<String> active) { if (active.contains(node)) return true; if (!visited.add(node)) return false; active.add(node); for (String next : graph.getOrDefault(node, List.of())) if (cycle(next, graph, visited, active)) return true; active.remove(node); return false; }
    private void requiredText(JsonNode node, String field, String code, String message, List<Map<String, Object>> errors) { if (node.path(field).asText().isBlank()) error(errors, code, message, node.path("id").asText(null), null); }
    private void error(List<Map<String, Object>> list, String code, String message, String nodeId, String connectionId) { Map<String, Object> item = new LinkedHashMap<>(); item.put("severity", "ERROR"); item.put("code", code); item.put("message", message); if (nodeId != null) item.put("nodeId", nodeId); if (connectionId != null) item.put("connectionId", connectionId); list.add(item); }
    private void warning(List<Map<String, Object>> list, String code, String message, String nodeId) { Map<String, Object> item = new LinkedHashMap<>(); item.put("severity", "WARNING"); item.put("code", code); item.put("message", message); if (nodeId != null) item.put("nodeId", nodeId); list.add(item); }
}
