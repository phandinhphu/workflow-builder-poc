package com.acme.workflow.runtime.evaluator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StructuredConditionEvaluatorTest {

    private StructuredConditionEvaluator evaluator;
    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        evaluator = new StructuredConditionEvaluator();
        mapper = new ObjectMapper();
    }

    @Test
    @DisplayName("Acceptance Criteria: { formData: { price: 6000000 } } with price > 5000000 returns true")
    void testAcceptanceCriteriaPriceGreaterThan() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "price": 6000000
                    }
                }
                """;
        String configJson = """
                {
                    "logic": "AND",
                    "rules": [
                        {
                            "field": "price",
                            "fieldType": "number",
                            "operator": "GREATER_THAN",
                            "value": 5000000
                        }
                    ]
                }
                """;

        JsonNode context = mapper.readTree(contextJson);
        JsonNode config = mapper.readTree(configJson);

        boolean result = evaluator.evaluate(config, context);
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Number operators: EQUALS, NOT_EQUALS, LESS_THAN, BETWEEN")
    void testNumberOperators() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "amount": 15000000
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // EQUALS true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "EQUALS", "value": 15000000 }]
                }
                """), context)).isTrue();

        // EQUALS false
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "EQUALS", "value": 20000000 }]
                }
                """), context)).isFalse();

        // NOT_EQUALS true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "NOT_EQUALS", "value": 10000000 }]
                }
                """), context)).isTrue();

        // LESS_THAN false
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "LESS_THAN", "value": 10000000 }]
                }
                """), context)).isFalse();

        // BETWEEN true (array [10M, 20M])
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "BETWEEN", "value": [10000000, 20000000] }]
                }
                """), context)).isTrue();

        // BETWEEN false
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "amount", "fieldType": "number", "operator": "BETWEEN", "value": [16000000, 20000000] }]
                }
                """), context)).isFalse();
    }

    @Test
    @DisplayName("String operators: EQUALS, CONTAINS, STARTS_WITH, IS_EMPTY, IS_NOT_EMPTY")
    void testStringOperators() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "destination": "Đà Nẵng",
                        "notes": ""
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // EQUALS
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "destination", "fieldType": "string", "operator": "EQUALS", "value": "Đà Nẵng" }]
                }
                """), context)).isTrue();

        // CONTAINS
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "destination", "fieldType": "string", "operator": "CONTAINS", "value": "Nẵng" }]
                }
                """), context)).isTrue();

        // STARTS_WITH
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "destination", "fieldType": "string", "operator": "STARTS_WITH", "value": "Đà" }]
                }
                """), context)).isTrue();

        // IS_EMPTY notes
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "notes", "fieldType": "string", "operator": "IS_EMPTY" }]
                }
                """), context)).isTrue();

        // IS_NOT_EMPTY destination
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "destination", "fieldType": "string", "operator": "IS_NOT_EMPTY" }]
                }
                """), context)).isTrue();
    }

    @Test
    @DisplayName("Boolean operators: IS_TRUE, IS_FALSE, EQUALS")
    void testBooleanOperators() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "isUrgent": true,
                        "approved": false
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "isUrgent", "fieldType": "boolean", "operator": "IS_TRUE" }]
                }
                """), context)).isTrue();

        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "approved", "fieldType": "boolean", "operator": "IS_FALSE" }]
                }
                """), context)).isTrue();
    }

    @Test
    @DisplayName("Date operators: BEFORE, AFTER, BETWEEN")
    void testDateOperators() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "departureDate": "2026-09-15"
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // BEFORE 2026-09-20 -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "departureDate", "fieldType": "date", "operator": "BEFORE", "value": "2026-09-20" }]
                }
                """), context)).isTrue();

        // AFTER 2026-09-10 -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "departureDate", "fieldType": "date", "operator": "AFTER", "value": "2026-09-10" }]
                }
                """), context)).isTrue();

        // BETWEEN [2026-09-01, 2026-09-30] -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "departureDate", "fieldType": "date", "operator": "BETWEEN", "value": ["2026-09-01", "2026-09-30"] }]
                }
                """), context)).isTrue();
    }

    @Test
    @DisplayName("Select & Multiselect: IN, NOT_IN, CONTAINS_ANY, CONTAINS_ALL")
    void testSelectAndMultiselectOperators() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "transport": "PLANE",
                        "tags": ["TECH", "URGENT", "VIP"]
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // Select IN ["TRAIN", "PLANE"] -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "transport", "fieldType": "select", "operator": "IN", "value": ["TRAIN", "PLANE"] }]
                }
                """), context)).isTrue();

        // Select NOT_IN ["CAR", "BUS"] -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "transport", "fieldType": "select", "operator": "NOT_IN", "value": ["CAR", "BUS"] }]
                }
                """), context)).isTrue();

        // Multiselect CONTAINS_ANY ["VIP", "OTHER"] -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "tags", "fieldType": "multiselect", "operator": "CONTAINS_ANY", "value": ["VIP", "OTHER"] }]
                }
                """), context)).isTrue();

        // Multiselect CONTAINS_ALL ["TECH", "VIP"] -> true
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "tags", "fieldType": "multiselect", "operator": "CONTAINS_ALL", "value": ["TECH", "VIP"] }]
                }
                """), context)).isTrue();
    }

    @Test
    @DisplayName("Logic combinations: AND vs OR")
    void testLogicCombinations() throws Exception {
        String contextJson = """
                {
                    "formData": {
                        "price": 12000000,
                        "transport": "TRAIN"
                    }
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // AND: price > 10M AND transport == 'PLANE' -> false
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [
                        { "field": "price", "fieldType": "number", "operator": "GREATER_THAN", "value": 10000000 },
                        { "field": "transport", "fieldType": "string", "operator": "EQUALS", "value": "PLANE" }
                    ]
                }
                """), context)).isFalse();

        // OR: price > 10M OR transport == 'PLANE' -> true (first is true)
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "OR",
                    "rules": [
                        { "field": "price", "fieldType": "number", "operator": "GREATER_THAN", "value": 10000000 },
                        { "field": "transport", "fieldType": "string", "operator": "EQUALS", "value": "PLANE" }
                    ]
                }
                """), context)).isTrue();
    }

    @Test
    @DisplayName("Fallback to context.variables and direct path")
    void testContextFallback() throws Exception {
        String contextJson = """
                {
                    "variables": {
                        "budget": 500000
                    },
                    "status": "ACTIVE"
                }
                """;
        JsonNode context = mapper.readTree(contextJson);

        // Resolves from variables.budget
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "budget", "fieldType": "number", "operator": "EQUALS", "value": 500000 }]
                }
                """), context)).isTrue();

        // Resolves from top-level status
        assertThat(evaluator.evaluate(mapper.readTree("""
                {
                    "logic": "AND",
                    "rules": [{ "field": "status", "fieldType": "string", "operator": "EQUALS", "value": "ACTIVE" }]
                }
                """), context)).isTrue();
    }
}
