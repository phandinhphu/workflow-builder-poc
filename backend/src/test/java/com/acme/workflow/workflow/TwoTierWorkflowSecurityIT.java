package com.acme.workflow.workflow;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TwoTierWorkflowSecurityIT {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private Jsons jsons;

    private ObjectNode createMinimalWorkflow(String id, String name, String moduleId, String type, String ownerId) {
        ObjectNode workflow = jsons.object();
        workflow.put("id", id);
        workflow.put("name", name);
        workflow.put("moduleId", moduleId);
        workflow.put("type", type != null ? type : "CUSTOM");
        workflow.put("ownerId", ownerId != null ? ownerId : "U000");
        workflow.put("draftVersion", "1.0");
        workflow.putObject("trigger").put("type", "manual");
        workflow.putArray("variables");

        var nodes = workflow.putArray("nodes");
        ObjectNode start = nodes.addObject();
        start.put("id", "start");
        start.put("type", "START");
        start.put("name", "Start");
        start.putObject("config");
        start.putObject("position").put("x", 0).put("y", 0);

        ObjectNode assignment = nodes.addObject();
        assignment.put("id", "task");
        assignment.put("type", "ASSIGNMENT");
        assignment.put("name", "Task");
        assignment.putObject("position").put("x", 0).put("y", 100);
        assignment.putObject("config").put("title", "Task").putObject("assignee").put("type", "fixed").put("value", "U001");

        ObjectNode end = nodes.addObject();
        end.put("id", "end");
        end.put("type", "END");
        end.put("name", "End");
        end.putObject("config");
        end.putObject("position").put("x", 0).put("y", 200);

        var connections = workflow.putArray("connections");
        connections.addObject().put("id", "c0").put("sourceNodeId", "start").put("sourcePort", "SUCCESS").put("targetNodeId", "task");
        connections.addObject().put("id", "c1").put("sourceNodeId", "task").put("sourcePort", "SUCCESS").put("targetNodeId", "end");

        return workflow;
    }

    @Test
    @DisplayName("GET /api/v1/workflows filters list by user accessible modules (Layer 1)")
    void testListWorkflowsFilteredByModuleScope() throws Exception {
        // Create an IT workflow as Admin
        ObjectNode itWf = createMinimalWorkflow("WF-SEC-IT-1", "IT Workflow 1", "MOD_IT", "CUSTOM", "U000");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(itWf)))
                .andExpect(status().isOk());

        // Create an HR workflow as Admin
        ObjectNode hrWf = createMinimalWorkflow("WF-SEC-HR-1", "HR Workflow 1", "MOD_HR", "CUSTOM", "U000");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isOk());

        // Admin U000 sees both HR and IT workflows
        mvc.perform(get("/api/v1/workflows").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'WF-SEC-IT-1')]").exists())
                .andExpect(jsonPath("$[?(@.id == 'WF-SEC-HR-1')]").exists());

        // User U001 (HR) only sees HR workflows and MOD_GENERAL, does not see IT workflow
        mvc.perform(get("/api/v1/workflows").header("X-User-Id", "U001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'WF-SEC-HR-1')]").exists())
                .andExpect(jsonPath("$[?(@.id == 'WF-SEC-IT-1')]").doesNotExist());

        // User U001 filtering explicitly by moduleId=MOD_HR succeeds
        mvc.perform(get("/api/v1/workflows?moduleId=MOD_HR").header("X-User-Id", "U001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'WF-SEC-HR-1')]").exists());

        // User U001 filtering explicitly by moduleId=MOD_IT fails with 403 Forbidden
        mvc.perform(get("/api/v1/workflows?moduleId=MOD_IT").header("X-User-Id", "U001"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/v1/workflows/{id} blocked with 403 if user lacks module access (IDOR prevention)")
    void testDirectGetWorkflowBlockedIfNoModuleAccess() throws Exception {
        ObjectNode itWf = createMinimalWorkflow("WF-SEC-IT-DIRECT", "IT Direct Test", "MOD_IT", "CUSTOM", "U000");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(itWf)))
                .andExpect(status().isOk());

        // U001 (HR specialist) attempts direct GET on IT workflow -> 403 Forbidden
        mvc.perform(get("/api/v1/workflows/WF-SEC-IT-DIRECT").header("X-User-Id", "U001"))
                .andExpect(status().isForbidden());

        // U000 (Admin) can GET IT workflow
        mvc.perform(get("/api/v1/workflows/WF-SEC-IT-DIRECT").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("WF-SEC-IT-DIRECT"))
                .andExpect(jsonPath("$.moduleId").value("MOD_IT"));
    }

    @Test
    @DisplayName("POST /api/v1/workflows allows creation in authorized module (MOD_HR)")
    void testCreateWorkflowAuthorizedModule() throws Exception {
        ObjectNode hrWf = createMinimalWorkflow("WF-SEC-HR-CREATE", "HR Creation Test", "MOD_HR", "CUSTOM", "U001");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("WF-SEC-HR-CREATE"))
                .andExpect(jsonPath("$.moduleId").value("MOD_HR"));
    }

    @Test
    @DisplayName("POST /api/v1/workflows blocked with 403 when creating in unauthorized module (MOD_IT)")
    void testCreateWorkflowUnauthorizedModuleBlocked() throws Exception {
        ObjectNode itWf = createMinimalWorkflow("WF-SEC-HR-IN-IT", "HR Attempting IT", "MOD_IT", "CUSTOM", "U001");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(itWf)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/v1/workflows blocked with 400 when creating with non-existent module")
    void testCreateWorkflowNonExistentModuleBlocked() throws Exception {
        ObjectNode invalidWf = createMinimalWorkflow("WF-SEC-INVALID-MOD", "Invalid Mod", "MOD_UNKNOWN", "CUSTOM", "U000");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(invalidWf)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PUT /api/v1/workflows/{id} transfer to unauthorized module is blocked with 403")
    void testSaveWorkflowChangingToUnauthorizedModuleBlocked() throws Exception {
        ObjectNode hrWf = createMinimalWorkflow("WF-SEC-HR-TRANSFER", "HR Transfer Test", "MOD_HR", "CUSTOM", "U001");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isOk());

        // U001 tries to change moduleId to MOD_FIN (which U001 has no access to)
        hrWf.put("moduleId", "MOD_FIN");
        mvc.perform(put("/api/v1/workflows/WF-SEC-HR-TRANSFER").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PUT /api/v1/workflows/{id} transfer to authorized module (MOD_GENERAL) succeeds")
    void testSaveWorkflowChangingToValidModuleSucceeds() throws Exception {
        ObjectNode hrWf = createMinimalWorkflow("WF-SEC-HR-TO-GEN", "HR To Gen Test", "MOD_HR", "CUSTOM", "U001");
        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isOk());

        // U001 changes moduleId to MOD_GENERAL (U001 has EDITOR access)
        hrWf.put("moduleId", "MOD_GENERAL");
        mvc.perform(put("/api/v1/workflows/WF-SEC-HR-TO-GEN").header("X-User-Id", "U001")
                .contentType(MediaType.APPLICATION_JSON).content(jsons.write(hrWf)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.moduleId").value("MOD_GENERAL"));
    }
}
