package com.acme.workflow.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowCompilerTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final WorkflowCompiler compiler = new WorkflowCompiler();

    @Test
    void acceptsCanonicalUpstreamFormOutputBinding() {
        Map<String, Object> report = compiler.validate(definition("${nodes.input.output.score}"));
        assertThat(report.get("valid")).isEqualTo(true);
        assertThat((List<?>) report.get("errors")).isEmpty();
    }

    @Test
    void rejectsDeletedNodeAndUnknownOutputBindingsBeforePublish() {
        Map<String, Object> deleted = compiler.validate(definition("${nodes.deleted.output.score}"));
        assertThat(codes(deleted)).contains("BINDING_NODE_NOT_FOUND");

        Map<String, Object> unknownOutput = compiler.validate(definition("${nodes.input.output.notDeclared}"));
        assertThat(codes(unknownOutput)).contains("BINDING_OUTPUT_NOT_FOUND");
    }

    private ObjectNode definition(String binding) {
        ObjectNode workflow = mapper.createObjectNode().put("name", "Binding test");
        workflow.putObject("trigger").put("type", "manual");
        workflow.putArray("variables");
        ArrayNode nodes = workflow.putArray("nodes");
        ObjectNode start = nodes.addObject().put("id", "start").put("type", "START").put("name", "Start");
        start.putObject("config");
        ObjectNode input = nodes.addObject().put("id", "input").put("type", "ASSIGNMENT").put("name", "Input");
        input.putObject("config").putObject("assignee").put("type", "fixed").put("value", "U001");
        input.path("config").withArrayProperty("formFields").addObject().put("id", "score").put("label", "Score").put("type", "number").put("outputMapping", "score");
        ObjectNode review = nodes.addObject().put("id", "review").put("type", "APPROVAL").put("name", "Review");
        review.putObject("config").putObject("assignee").put("type", "fixed").put("value", "U001");
        review.path("config").withArrayProperty("formFields").addObject().put("id", "display").put("label", "Display").put("type", "number").put("defaultValue", binding).put("outputMapping", "display");
        ObjectNode end = nodes.addObject().put("id", "end").put("type", "END").put("name", "End");
        end.putObject("config");
        var connections = workflow.putArray("connections");
        connections.addObject().put("id", "c1").put("sourceNodeId", "start").put("sourcePort", "SUCCESS").put("targetNodeId", "input");
        connections.addObject().put("id", "c2").put("sourceNodeId", "input").put("sourcePort", "SUCCESS").put("targetNodeId", "review");
        connections.addObject().put("id", "c3").put("sourceNodeId", "review").put("sourcePort", "APPROVED").put("targetNodeId", "end");
        return workflow;
    }

    @SuppressWarnings("unchecked")
    private List<String> codes(Map<String, Object> report) {
        return ((List<Map<String, Object>>) report.get("errors")).stream().map(error -> String.valueOf(error.get("code"))).toList();
    }
}
