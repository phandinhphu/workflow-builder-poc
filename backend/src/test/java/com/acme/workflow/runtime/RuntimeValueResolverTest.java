package com.acme.workflow.runtime;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeValueResolverTest {
    private Jsons jsons;
    private RuntimeValueResolver resolver;
    private ObjectNode context;

    @BeforeEach
    void setUp() {
        jsons = new Jsons(new ObjectMapper());
        resolver = new RuntimeValueResolver(jsons);
        context = jsons.object();
        context.putObject("nodes").putObject("step-1").putObject("output").put("score", 8).put("comment", "Tốt");
        context.putObject("participant").put("name", "Nguyễn Văn A");
    }

    @Test
    void resolvesTypedCanonicalLegacyBracketAndTemplateValues() {
        assertThat(resolver.resolve(jsons.value("${nodes.step-1.output.score}"), context).value().asInt()).isEqualTo(8);
        assertThat(resolver.resolve(jsons.value("${nodes['step-1'].output.comment}"), context).value().asText()).isEqualTo("Tốt");
        assertThat(resolver.render("Nhân viên ${participant.name}: ${nodes.step-1.output.score}", context)).isEqualTo("Nhân viên Nguyễn Văn A: 8");
    }

    @Test
    void resolvesValueBindingsAndNestedArraysWithoutLosingTypes() {
        ObjectNode reference = jsons.object().put("kind", "REFERENCE").put("path", "nodes.step-1.output.score");
        ObjectNode constant = jsons.object().put("kind", "CONSTANT").put("value", true);
        ArrayNode bindings = jsons.mapper().createArrayNode().add(reference).add(constant);

        RuntimeValueResolver.Resolution result = resolver.resolve(bindings, context);

        assertThat(result.resolved()).isTrue();
        assertThat(result.value().get(0).isInt()).isTrue();
        assertThat(result.value().get(0).asInt()).isEqualTo(8);
        assertThat(result.value().get(1).asBoolean()).isTrue();
    }

    @Test
    void reportsMissingReferenceAndSupportsDefaultPolicy() {
        RuntimeValueResolver.Resolution missing = resolver.resolve(jsons.value("${nodes.deleted.output.score}"), context);
        assertThat(missing.resolved()).isFalse();
        assertThat(missing.firstMissingPath()).isEqualTo("nodes.deleted.output.score");

        ObjectNode binding = jsons.object().put("kind", "REFERENCE").put("path", "nodes.deleted.output.score")
                .put("onMissing", "DEFAULT").put("defaultValue", 0);
        RuntimeValueResolver.Resolution fallback = resolver.resolve(binding, context);
        assertThat(fallback.resolved()).isTrue();
        assertThat(fallback.value().asInt()).isZero();
    }

    @Test
    void evaluatesCanonicalFormOutputsAndTypeAwareCollectionOperators() {
        ObjectNode formOutput = context.withObject("nodes").putObject("form-1").putObject("output");
        formOutput.put("amount", 12_500_000);
        formOutput.put("department", "IT");
        formOutput.putArray("tags").add("urgent").add("hardware");
        context.putObject("variables").putArray("allowedDepartments").add("HR").add("IT");

        assertThat(resolver.evaluate("${nodes.form-1.output.amount} >= 10000000", context)).isTrue();
        assertThat(resolver.evaluate("contains(${nodes.form-1.output.tags}, 'urgent')", context)).isTrue();
        assertThat(resolver.evaluate("in(${nodes.form-1.output.department}, 'HR, IT')", context)).isTrue();
        assertThat(resolver.evaluate("in(${nodes.form-1.output.department}, ${variables.allowedDepartments})", context)).isTrue();
    }
}
