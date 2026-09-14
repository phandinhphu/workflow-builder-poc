package com.acme.workflow.workflowtype;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class WorkflowTypeApiIT {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("GET /api/v1/workflow-types returns all 5 seeded workflow types in order")
    void testListWorkflowTypesSummary() throws Exception {
        mvc.perform(get("/api/v1/workflow-types").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].id").value("APPROVAL"))
                .andExpect(jsonPath("$[1].id").value("NOTIFICATION"))
                .andExpect(jsonPath("$[2].id").value("AUTOMATION"))
                .andExpect(jsonPath("$[3].id").value("REVIEW"))
                .andExpect(jsonPath("$[4].id").value("CUSTOM"))
                .andExpect(jsonPath("$[0].allowedNodes").doesNotExist());
    }

    @Test
    @DisplayName("GET /api/v1/workflow-types?includeDetails=true returns types with allowedNodes and rules")
    void testListWorkflowTypesDetails() throws Exception {
        mvc.perform(get("/api/v1/workflow-types?includeDetails=true").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].id").value("APPROVAL"))
                .andExpect(jsonPath("$[0].allowedNodes", hasItems("START", "END", "APPROVAL", "ASSIGNMENT", "NOTIFICATION", "CONDITION")))
                .andExpect(jsonPath("$[0].rules", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$[0].rules[0].ruleCode").value("REQUIRED_NODE"));
    }

    @Test
    @DisplayName("GET /api/v1/workflow-types/{id} returns detailed single workflow type")
    void testGetWorkflowTypeById() throws Exception {
        mvc.perform(get("/api/v1/workflow-types/NOTIFICATION").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("NOTIFICATION"))
                .andExpect(jsonPath("$.name").value("Quy trình thông báo"))
                .andExpect(jsonPath("$.allowedNodes", hasItems("START", "END", "NOTIFICATION", "CONDITION")))
                .andExpect(jsonPath("$.rules", hasSize(2)));
    }

    @Test
    @DisplayName("GET /api/v1/workflow-types/{id}/allowed-nodes returns string list of allowed node types")
    void testGetAllowedNodes() throws Exception {
        mvc.perform(get("/api/v1/workflow-types/CUSTOM/allowed-nodes").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(16))
                .andExpect(jsonPath("$", hasItems("START", "END", "APPROVAL", "REVIEW", "ASSIGNMENT", "NOTIFICATION", "CONDITION", "SYSTEM", "DATA", "HTTP", "DATA_TRANSFORM", "TIMER", "WAIT_EVENT", "PARALLEL_SPLIT", "JOIN", "SUBWORKFLOW")));
    }

    @Test
    @DisplayName("GET /api/v1/workflow-types/{id}/rules returns validation rules")
    void testGetValidationRules() throws Exception {
        mvc.perform(get("/api/v1/workflow-types/NOTIFICATION/rules").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.ruleCode == 'REQUIRED_NODE')].targetNodeType").value("NOTIFICATION"))
                .andExpect(jsonPath("$[?(@.ruleCode == 'FORBIDDEN_NODE')].targetNodeType").value("APPROVAL"));
    }

    @Test
    @DisplayName("GET unknown workflow type returns 404")
    void testGetUnknownWorkflowType() throws Exception {
        mvc.perform(get("/api/v1/workflow-types/NON_EXISTING").header("X-User-Id", "U000"))
                .andExpect(status().isNotFound());
    }
}
