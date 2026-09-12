package com.acme.workflow.runtime;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.category.TicketCategoryService;
import com.acme.workflow.category.dto.CreateTicketCategoryRequest;
import com.acme.workflow.category.dto.TicketCategoryResponse;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.FormService;
import com.acme.workflow.form.dto.CreateFormRequest;
import com.acme.workflow.form.dto.FormDetailResponse;
import com.acme.workflow.form.dto.FormVersionResponse;
import com.acme.workflow.form.dto.UpdateDraftRequest;
import com.acme.workflow.ticket.TicketService;
import com.acme.workflow.ticket.domain.TicketEntity;
import com.acme.workflow.ticket.dto.CreateTicketRequest;
import com.acme.workflow.ticket.dto.TicketDetailResponse;
import com.acme.workflow.ticket.repository.TicketRepository;
import com.acme.workflow.workflow.WorkflowService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class ApprovalTaskIntegrationTest {

    @Autowired WorkflowService workflows;
    @Autowired FormService formService;
    @Autowired TicketCategoryService categoryService;
    @Autowired TicketService ticketService;
    @Autowired TicketRepository ticketRepository;
    @Autowired RuntimeEngineService engine;
    @Autowired RuntimeQueryService query;
    @Autowired Jsons jsons;

    @MockitoBean
    CurrentUserService currentUserService;

    @Test
    void testManagerOfApprovalAndTicketResolution() {
        // 1. Create a Form
        when(currentUserService.id()).thenReturn("U000"); // Admin

        CreateFormRequest formReq = new CreateFormRequest();
        formReq.name = "Đơn xin đi công tác";
        formReq.code = "FORM_EXPENSE_" + System.currentTimeMillis();
        FormDetailResponse form = formService.create(formReq);

        UpdateDraftRequest schemaReq = new UpdateDraftRequest();
        schemaReq.draftSchema = jsons.read("""
            {
              "fields": [
                { "key": "destination", "label": "Địa điểm", "type": "string", "required": true },
                { "key": "budget", "label": "Ngân sách", "type": "number", "required": true }
              ]
            }
            """);
        formService.updateDraft(form.id, schemaReq);
        FormVersionResponse formVersion = formService.publish(form.id);

        // 2. Create a Workflow with MANAGER_OF approval
        String workflowId = "WF-EXPENSE-" + System.currentTimeMillis();
        ObjectNode definition = jsons.object();
        definition.put("id", workflowId).put("name", "Quy trình duyệt chi phí").put("type", "Approval")
                .put("ownerId", "U000").put("draftVersion", "1.0");
        definition.putObject("trigger").put("type", "manual").putObject("config");
        definition.putArray("variables");

        var nodes = definition.putArray("nodes");
        node(nodes.addObject(), "start", "START", jsons.object());

        ObjectNode approvalConfig = jsons.object().put("title", "Quản lý duyệt chi phí");
        approvalConfig.putObject("assignee").put("type", "manager_of");
        node(nodes.addObject(), "approval_manager", "APPROVAL", approvalConfig);

        ObjectNode successEnd = jsons.object();
        node(nodes.addObject(), "end_approved", "END", successEnd);

        ObjectNode rejectEnd = jsons.object().put("endType", "REJECTED");
        node(nodes.addObject(), "end_rejected", "END", rejectEnd);

        var edges = definition.putArray("connections");
        edge(edges.addObject(), "c1", "start", "SUCCESS", "approval_manager");
        edge(edges.addObject(), "c2", "approval_manager", "APPROVED", "end_approved");
        edge(edges.addObject(), "c3", "approval_manager", "REJECTED", "end_rejected");

        definition.putObject("settings").put("maxIterations", 10);
        workflows.create(definition);
        var pubResult = workflows.publish(workflowId);
        String workflowExecutableId = (String) pubResult.get("versionId");

        // 3. Create TicketCategory
        CreateTicketCategoryRequest catReq = new CreateTicketCategoryRequest();
        catReq.name = "Duyệt công tác";
        catReq.code = "CAT_EXPENSE_" + System.currentTimeMillis();
        catReq.formVersionId = formVersion.id;
        catReq.workflowExecutableId = workflowExecutableId;
        catReq.fieldMapping = jsons.object();
        TicketCategoryResponse category = categoryService.create(catReq);

        // 4. Employee U002 (Bach - manager is U004) submits a Ticket
        when(currentUserService.id()).thenReturn("U002");
        CreateTicketRequest ticketReq = new CreateTicketRequest();
        ticketReq.categoryId = category.id;
        ticketReq.formData = jsons.read("""
            {
              "destination": "Đà Nẵng",
              "budget": 15000000
            }
            """);

        TicketDetailResponse ticketResp = ticketService.createTicket(ticketReq);
        assertThat(ticketResp).isNotNull();
        assertThat(ticketResp.status).isIn("SUBMITTED", "IN_REVIEW");

        // 5. Query tasks for Manager U004
        when(currentUserService.id()).thenReturn("U004");
        List<Map<String, Object>> managerTasks = query.tasks("PENDING", null, null);
        Map<String, Object> task = managerTasks.stream()
                .filter(t -> ticketResp.id.equals(t.get("ticketId")))
                .findFirst()
                .orElse(null);

        assertThat(task).isNotNull();
        assertThat(task.get("ticketCode")).isEqualTo(ticketResp.ticketCode);
        assertThat(task.get("taskType")).isEqualTo("APPROVAL");
        assertThat(task.get("formSchemaSnapshot")).isNotNull();
        assertThat(task.get("formData")).isNotNull();

        // 6. Manager U004 approves the task
        String taskId = (String) task.get("id");
        ObjectNode approvalAct = jsons.object().put("comment", "Đồng ý phê duyệt công tác");
        Map<String, Object> actResult = engine.act(taskId, "COMPLETE", approvalAct);
        assertThat(actResult.get("success")).isEqualTo(true);

        // 7. Verify Ticket is now APPROVED
        TicketEntity updatedTicket = ticketRepository.findById(ticketResp.id).orElseThrow();
        assertThat(updatedTicket.status).isEqualTo("APPROVED");
        assertThat(updatedTicket.resolvedAt).isNotNull();
    }

    @Test
    void testManagerOfRejectionAndTicketResolution() {
        when(currentUserService.id()).thenReturn("U000"); // Admin

        CreateFormRequest formReq = new CreateFormRequest();
        formReq.name = "Đơn mua sắm thiết bị";
        formReq.code = "FORM_PURCHASE_" + System.currentTimeMillis();
        FormDetailResponse form = formService.create(formReq);

        UpdateDraftRequest schemaReq = new UpdateDraftRequest();
        schemaReq.draftSchema = jsons.read("""
            {
              "fields": [
                { "key": "item_name", "label": "Thiết bị", "type": "string", "required": true },
                { "key": "price", "label": "Đơn giá", "type": "number", "required": true }
              ]
            }
            """);
        formService.updateDraft(form.id, schemaReq);
        FormVersionResponse formVersion = formService.publish(form.id);

        String workflowId = "WF-PURCHASE-" + System.currentTimeMillis();
        ObjectNode definition = jsons.object();
        definition.put("id", workflowId).put("name", "Quy trình mua sắm").put("type", "Approval")
                .put("ownerId", "U000").put("draftVersion", "1.0");
        definition.putObject("trigger").put("type", "manual").putObject("config");
        definition.putArray("variables");

        var nodes = definition.putArray("nodes");
        node(nodes.addObject(), "start", "START", jsons.object());

        ObjectNode approvalConfig = jsons.object().put("title", "Quản lý duyệt mua sắm");
        approvalConfig.putObject("assignee").put("type", "manager_of");
        node(nodes.addObject(), "approval_manager", "APPROVAL", approvalConfig);

        ObjectNode successEnd = jsons.object();
        node(nodes.addObject(), "end_approved", "END", successEnd);

        ObjectNode rejectEnd = jsons.object().put("endType", "REJECTED");
        node(nodes.addObject(), "end_rejected", "END", rejectEnd);

        var edges = definition.putArray("connections");
        edge(edges.addObject(), "c1", "start", "SUCCESS", "approval_manager");
        edge(edges.addObject(), "c2", "approval_manager", "APPROVED", "end_approved");
        edge(edges.addObject(), "c3", "approval_manager", "REJECTED", "end_rejected");

        definition.putObject("settings").put("maxIterations", 10);
        workflows.create(definition);
        var pubResult = workflows.publish(workflowId);
        String workflowExecutableId = (String) pubResult.get("versionId");

        CreateTicketCategoryRequest catReq = new CreateTicketCategoryRequest();
        catReq.name = "Mua sắm thiết bị";
        catReq.code = "CAT_PURCHASE_" + System.currentTimeMillis();
        catReq.formVersionId = formVersion.id;
        catReq.workflowExecutableId = workflowExecutableId;
        catReq.fieldMapping = jsons.object();
        TicketCategoryResponse category = categoryService.create(catReq);

        // Employee U002 submits Ticket
        when(currentUserService.id()).thenReturn("U002");
        CreateTicketRequest ticketReq = new CreateTicketRequest();
        ticketReq.categoryId = category.id;
        ticketReq.formData = jsons.read("""
            {
              "item_name": "Macbook Pro M3",
              "price": 45000000
            }
            """);

        TicketDetailResponse ticketResp = ticketService.createTicket(ticketReq);

        // Manager U004 rejects the task
        when(currentUserService.id()).thenReturn("U004");
        List<Map<String, Object>> managerTasks = query.tasks("PENDING", null, null);
        Map<String, Object> task = managerTasks.stream()
                .filter(t -> ticketResp.id.equals(t.get("ticketId")))
                .findFirst()
                .orElseThrow();

        String taskId = (String) task.get("id");
        ObjectNode rejectAct = jsons.object().put("comment", "Chi phí quá cao so với ngân sách cho phép");
        Map<String, Object> actResult = engine.act(taskId, "REJECT", rejectAct);
        assertThat(actResult.get("success")).isEqualTo(true);

        // Verify Ticket is now REJECTED
        TicketEntity updatedTicket = ticketRepository.findById(ticketResp.id).orElseThrow();
        assertThat(updatedTicket.status).isEqualTo("REJECTED");
        assertThat(updatedTicket.resolvedAt).isNotNull();
    }

    private void node(ObjectNode target, String id, String type, ObjectNode config) {
        target.put("id", id).put("name", id).put("type", type).set("config", config);
    }

    private void edge(ObjectNode target, String id, String src, String port, String dst) {
        target.put("id", id).put("sourceNodeId", src).put("sourcePort", port).put("targetNodeId", dst);
    }
}
