package com.acme.workflow.workflow;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class WorkflowApiIT {
    @Autowired MockMvc mvc;
    @Autowired Jsons jsons;

    @Test
    void createsValidatesPublishesAndReadsImmutableVersionThroughApi() throws Exception {
        ObjectNode workflow=jsons.object();workflow.put("id","WF-API-JPA");workflow.put("name","Workflow API JPA");workflow.put("type","CUSTOM");workflow.put("module","MOD_GENERAL");workflow.put("ownerId","U000");workflow.put("draftVersion","1.0");workflow.putObject("trigger").put("type","manual");workflow.putArray("variables");
        var nodes=workflow.putArray("nodes");ObjectNode start=nodes.addObject();start.put("id","start");start.put("type","START");start.put("name","Start");start.putObject("config");start.putObject("position").put("x",0).put("y",0);ObjectNode assignment=nodes.addObject();assignment.put("id","task");assignment.put("type","ASSIGNMENT");assignment.put("name","Task");assignment.putObject("position").put("x",0).put("y",100);assignment.putObject("config").put("title","Task").putObject("assignee").put("type","fixed").put("value","U001");ObjectNode end=nodes.addObject();end.put("id","end");end.put("type","END");end.put("name","End");end.putObject("config");end.putObject("position").put("x",0).put("y",200);
        var connections=workflow.putArray("connections");connections.addObject().put("id","c0").put("sourceNodeId","start").put("sourcePort","SUCCESS").put("targetNodeId","task");connections.addObject().put("id","c1").put("sourceNodeId","task").put("sourcePort","SUCCESS").put("targetNodeId","end");

        mvc.perform(post("/api/v1/workflows").header("X-User-Id","U000").contentType(MediaType.APPLICATION_JSON).content(jsons.write(workflow)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value("WF-API-JPA")).andExpect(jsonPath("$.status").value("DRAFT"));
        mvc.perform(post("/api/v1/workflows/WF-API-JPA/validate").header("X-User-Id","U000"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.valid").value(true));
        mvc.perform(post("/api/v1/workflows/WF-API-JPA/publish").header("X-User-Id","U000"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.workflow.status").value("PUBLISHED")).andExpect(jsonPath("$.versionNo").value("1.0"));
        mvc.perform(post("/api/v1/workflows/WF-API-JPA/instances").header("X-User-Id","U000").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"participantUserIds\":[\"U002\"],\"variables\":{}}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RUNNING")).andExpect(jsonPath("$.participantCount").value(1));
        mvc.perform(post("/api/v1/workflows/WF-API-JPA/publish").header("X-User-Id","U000"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.workflow.status").value("PUBLISHED")).andExpect(jsonPath("$.versionNo").value("1.0"));
        mvc.perform(get("/api/v1/workflows/WF-API-JPA/versions").header("X-User-Id","U000"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("PUBLISHED")).andExpect(jsonPath("$[0].checksum").isNotEmpty());
    }

    @Test
    void rejectsPublishWhenNotificationWorkflowContainsForbiddenApprovalNode() throws Exception {
        ObjectNode workflow = jsons.object();
        workflow.put("id", "WF-NOTI-INVALID");
        workflow.put("name", "Notification Workflow with Approval");
        workflow.put("type", "NOTIFICATION");
        workflow.put("ownerId", "U000");
        workflow.putObject("trigger").put("type", "manual");
        workflow.putArray("variables");

        var nodes = workflow.putArray("nodes");
        nodes.addObject().put("id", "start").put("type", "START").put("name", "Start").putObject("config");

        ObjectNode notiNode = nodes.addObject();
        notiNode.put("id", "noti").put("type", "NOTIFICATION").put("name", "Notify");
        notiNode.putObject("config").putObject("assignee").put("type", "fixed").put("value", "U001");
        notiNode.path("config").withArrayProperty("channels").add("inapp");

        ObjectNode appNode = nodes.addObject();
        appNode.put("id", "app1").put("type", "APPROVAL").put("name", "Phê duyệt");
        appNode.putObject("config").putObject("assignee").put("type", "fixed").put("value", "U001");

        nodes.addObject().put("id", "end").put("type", "END").put("name", "End").putObject("config");

        var connections = workflow.putArray("connections");
        connections.addObject().put("id", "c1").put("sourceNodeId", "start").put("sourcePort", "SUCCESS").put("targetNodeId", "noti");
        connections.addObject().put("id", "c2").put("sourceNodeId", "noti").put("sourcePort", "SUCCESS").put("targetNodeId", "app1");
        connections.addObject().put("id", "c3").put("sourceNodeId", "app1").put("sourcePort", "APPROVED").put("targetNodeId", "end");

        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000").contentType(MediaType.APPLICATION_JSON).content(jsons.write(workflow)))
                .andExpect(status().isOk());

        // Validation returns valid = false
        mvc.perform(post("/api/v1/workflows/WF-NOTI-INVALID/validate").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.errors[?(@.code == 'FORBIDDEN_NODE')]").isNotEmpty());

        // Publish fails with 400 Bad Request
        mvc.perform(post("/api/v1/workflows/WF-NOTI-INVALID/publish").header("X-User-Id", "U000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("WORKFLOW_INVALID"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("FORBIDDEN_NODE")));
    }

    @Test
    void publishesSuccessfullyWhenApprovalWorkflowMeetsRules() throws Exception {
        ObjectNode workflow = jsons.object();
        workflow.put("id", "WF-APPR-VALID");
        workflow.put("name", "Valid Approval Workflow");
        workflow.put("type", "APPROVAL");
        workflow.put("ownerId", "U000");
        workflow.putObject("trigger").put("type", "manual");
        workflow.putArray("variables");

        var nodes = workflow.putArray("nodes");
        nodes.addObject().put("id", "start").put("type", "START").put("name", "Start").putObject("config");

        ObjectNode appNode = nodes.addObject();
        appNode.put("id", "app1").put("type", "APPROVAL").put("name", "Phê duyệt");
        appNode.putObject("config").putObject("assignee").put("type", "fixed").put("value", "U001");

        nodes.addObject().put("id", "end").put("type", "END").put("name", "End").putObject("config");

        var connections = workflow.putArray("connections");
        connections.addObject().put("id", "c1").put("sourceNodeId", "start").put("sourcePort", "SUCCESS").put("targetNodeId", "app1");
        connections.addObject().put("id", "c2").put("sourceNodeId", "app1").put("sourcePort", "APPROVED").put("targetNodeId", "end");

        mvc.perform(post("/api/v1/workflows").header("X-User-Id", "U000").contentType(MediaType.APPLICATION_JSON).content(jsons.write(workflow)))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/workflows/WF-APPR-VALID/validate").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));

        mvc.perform(post("/api/v1/workflows/WF-APPR-VALID/publish").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workflow.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.versionNo").value("1.0"));
    }
}
