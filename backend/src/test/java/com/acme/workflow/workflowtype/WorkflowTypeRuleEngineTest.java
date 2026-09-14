package com.acme.workflow.workflowtype;

import com.acme.workflow.workflowtype.domain.WorkflowTypeAllowedNodeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeEntity;
import com.acme.workflow.workflowtype.domain.WorkflowTypeValidationRuleEntity;
import com.acme.workflow.workflowtype.repository.WorkflowTypeAllowedNodeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeValidationRuleRepository;
import com.acme.workflow.workflowtype.validator.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WorkflowTypeRuleEngineTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private WorkflowTypeRepository workflowTypeRepo;
    private WorkflowTypeAllowedNodeRepository allowedNodeRepo;
    private WorkflowTypeValidationRuleRepository validationRuleRepo;
    private WorkflowTypeRuleEngine engine;

    @BeforeEach
    void setUp() {
        workflowTypeRepo = mock(WorkflowTypeRepository.class);
        allowedNodeRepo = mock(WorkflowTypeAllowedNodeRepository.class);
        validationRuleRepo = mock(WorkflowTypeValidationRuleRepository.class);

        RequiredNodeRuleHandler requiredHandler = new RequiredNodeRuleHandler(mapper);
        ForbiddenNodeRuleHandler forbiddenHandler = new ForbiddenNodeRuleHandler();
        AllowedNodeSetHandler allowedHandler = new AllowedNodeSetHandler();

        engine = new WorkflowTypeRuleEngine(
                workflowTypeRepo,
                allowedNodeRepo,
                validationRuleRepo,
                List.of(requiredHandler, forbiddenHandler),
                allowedHandler
        );

        when(workflowTypeRepo.existsById("APPROVAL")).thenReturn(true);
        when(workflowTypeRepo.existsById("NOTIFICATION")).thenReturn(true);
        when(workflowTypeRepo.existsById("AUTOMATION")).thenReturn(true);
        when(workflowTypeRepo.existsById("REVIEW")).thenReturn(true);
        when(workflowTypeRepo.existsById("CUSTOM")).thenReturn(true);
    }

    private WorkflowValidationContext createContext(String workflowType, Map<String, String> nodeTypes, Map<String, String> nodeNames) {
        ObjectNode def = mapper.createObjectNode();
        if (workflowType != null) {
            def.put("type", workflowType);
        }
        Map<String, JsonNode> nodesById = new HashMap<>();
        for (String id : nodeTypes.keySet()) {
            nodesById.put(id, mapper.createObjectNode().put("id", id).put("type", nodeTypes.get(id)));
        }
        return new WorkflowValidationContext(def, workflowType, nodesById, nodeTypes, nodeNames != null ? nodeNames : Collections.emptyMap());
    }

    @Test
    void rejectsMissingWorkflowType() {
        WorkflowValidationContext ctx = createContext(null, Map.of("s1", "START"), null);
        List<Map<String, Object>> errors = new ArrayList<>();
        engine.validate(ctx, errors, new ArrayList<>());

        assertThat(errors).isNotEmpty();
        assertThat(errors.get(0).get("code")).isEqualTo("WORKFLOW_TYPE_REQUIRED");
    }

    @Test
    void rejectsUnknownWorkflowType() {
        when(workflowTypeRepo.existsById("UNKNOWN_TYPE")).thenReturn(false);
        WorkflowValidationContext ctx = createContext("UNKNOWN_TYPE", Map.of("s1", "START"), null);
        List<Map<String, Object>> errors = new ArrayList<>();
        engine.validate(ctx, errors, new ArrayList<>());

        assertThat(errors).isNotEmpty();
        assertThat(errors.get(0).get("code")).isEqualTo("WORKFLOW_TYPE_INVALID");
    }

    @Test
    void bypassesLayer2ForCustomType() {
        WorkflowValidationContext ctx = createContext("CUSTOM", Map.of(
                "s", "START",
                "sys", "SYSTEM",
                "app", "APPROVAL",
                "e", "END"
        ), null);
        List<Map<String, Object>> errors = new ArrayList<>();
        engine.validate(ctx, errors, new ArrayList<>());

        assertThat(errors).isEmpty();
    }

    @Test
    void approvalType_validatesRequiredApprovalNode() {
        WorkflowTypeValidationRuleEntity reqRule = new WorkflowTypeValidationRuleEntity();
        reqRule.ruleCode = "REQUIRED_NODE";
        reqRule.targetNodeType = "APPROVAL";
        reqRule.errorMessage = "Workflow loại Phê duyệt bắt buộc phải có ít nhất 1 bước Phê duyệt (Approval).";
        reqRule.ruleConfig = "{\"min\": 1}";

        when(validationRuleRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(reqRule));

        WorkflowTypeAllowedNodeEntity an1 = new WorkflowTypeAllowedNodeEntity();
        an1.nodeType = "START";
        WorkflowTypeAllowedNodeEntity an2 = new WorkflowTypeAllowedNodeEntity();
        an2.nodeType = "APPROVAL";
        WorkflowTypeAllowedNodeEntity an3 = new WorkflowTypeAllowedNodeEntity();
        an3.nodeType = "ASSIGNMENT";
        WorkflowTypeAllowedNodeEntity an4 = new WorkflowTypeAllowedNodeEntity();
        an4.nodeType = "END";
        when(allowedNodeRepo.findByWorkflowTypeId("APPROVAL")).thenReturn(List.of(an1, an2, an3, an4));

        // 1. Valid case: has APPROVAL node
        WorkflowValidationContext validCtx = createContext("APPROVAL", Map.of(
                "s", "START",
                "app", "APPROVAL",
                "e", "END"
        ), Map.of("app", "Phê duyệt lãnh đạo"));
        List<Map<String, Object>> validErrors = new ArrayList<>();
        engine.validate(validCtx, validErrors, new ArrayList<>());
        assertThat(validErrors).isEmpty();

        // 2. Invalid case: missing APPROVAL node
        WorkflowValidationContext invalidCtx = createContext("APPROVAL", Map.of(
                "s", "START",
                "asg", "ASSIGNMENT",
                "e", "END"
        ), Map.of("asg", "Giao việc"));
        List<Map<String, Object>> invalidErrors = new ArrayList<>();
        engine.validate(invalidCtx, invalidErrors, new ArrayList<>());
        assertThat(invalidErrors).hasSize(1);
        assertThat(invalidErrors.get(0).get("code")).isEqualTo("REQUIRED_NODE");
        assertThat(invalidErrors.get(0).get("message")).isEqualTo(reqRule.errorMessage);
    }

    @Test
    void notificationType_validatesRequiredAndForbiddenNodes() {
        WorkflowTypeValidationRuleEntity reqRule = new WorkflowTypeValidationRuleEntity();
        reqRule.ruleCode = "REQUIRED_NODE";
        reqRule.targetNodeType = "NOTIFICATION";
        reqRule.errorMessage = "Workflow loại Thông báo bắt buộc phải có ít nhất 1 bước Thông báo (Notification).";
        reqRule.ruleConfig = "{\"min\": 1}";

        WorkflowTypeValidationRuleEntity forbRule = new WorkflowTypeValidationRuleEntity();
        forbRule.ruleCode = "FORBIDDEN_NODE";
        forbRule.targetNodeType = "APPROVAL";
        forbRule.errorMessage = "Workflow loại Thông báo không được chứa bước Phê duyệt (Approval).";

        when(validationRuleRepo.findByWorkflowTypeId("NOTIFICATION")).thenReturn(List.of(reqRule, forbRule));

        WorkflowTypeAllowedNodeEntity an1 = new WorkflowTypeAllowedNodeEntity();
        an1.nodeType = "START";
        WorkflowTypeAllowedNodeEntity an2 = new WorkflowTypeAllowedNodeEntity();
        an2.nodeType = "NOTIFICATION";
        WorkflowTypeAllowedNodeEntity an3 = new WorkflowTypeAllowedNodeEntity();
        an3.nodeType = "END";
        when(allowedNodeRepo.findByWorkflowTypeId("NOTIFICATION")).thenReturn(List.of(an1, an2, an3));

        // 1. Valid case
        WorkflowValidationContext validCtx = createContext("NOTIFICATION", Map.of(
                "s", "START",
                "noti", "NOTIFICATION",
                "e", "END"
        ), Map.of("noti", "Thông báo qua Email"));
        List<Map<String, Object>> validErrors = new ArrayList<>();
        engine.validate(validCtx, validErrors, new ArrayList<>());
        assertThat(validErrors).isEmpty();

        // 2. Invalid case: Contains forbidden APPROVAL node
        WorkflowValidationContext forbCtx = createContext("NOTIFICATION", Map.of(
                "s", "START",
                "noti", "NOTIFICATION",
                "app1", "APPROVAL",
                "e", "END"
        ), Map.of("noti", "Thông báo", "app1", "Phê duyệt cấp 1"));
        List<Map<String, Object>> forbErrors = new ArrayList<>();
        engine.validate(forbCtx, forbErrors, new ArrayList<>());

        // Note: APPROVAL will trigger both NODE_TYPE_NOT_ALLOWED and FORBIDDEN_NODE
        List<String> codes = forbErrors.stream().map(e -> (String) e.get("code")).toList();
        assertThat(codes).contains("FORBIDDEN_NODE", "NODE_TYPE_NOT_ALLOWED");

        Map<String, Object> forbiddenError = forbErrors.stream()
                .filter(e -> "FORBIDDEN_NODE".equals(e.get("code")))
                .findFirst().orElseThrow();
        assertThat(forbiddenError.get("nodeId")).isEqualTo("app1");
        assertThat((String) forbiddenError.get("message")).contains("Phê duyệt cấp 1");
    }

    @Test
    void rejectsDisallowedNodeTypes() {
        WorkflowTypeAllowedNodeEntity an1 = new WorkflowTypeAllowedNodeEntity();
        an1.nodeType = "START";
        WorkflowTypeAllowedNodeEntity an2 = new WorkflowTypeAllowedNodeEntity();
        an2.nodeType = "NOTIFICATION";
        WorkflowTypeAllowedNodeEntity an3 = new WorkflowTypeAllowedNodeEntity();
        an3.nodeType = "END";
        when(allowedNodeRepo.findByWorkflowTypeId("NOTIFICATION")).thenReturn(List.of(an1, an2, an3));

        WorkflowTypeValidationRuleEntity reqRule = new WorkflowTypeValidationRuleEntity();
        reqRule.ruleCode = "REQUIRED_NODE";
        reqRule.targetNodeType = "NOTIFICATION";
        reqRule.errorMessage = "Cần notification";
        when(validationRuleRepo.findByWorkflowTypeId("NOTIFICATION")).thenReturn(List.of(reqRule));

        WorkflowValidationContext ctx = createContext("NOTIFICATION", Map.of(
                "s", "START",
                "noti", "NOTIFICATION",
                "sys1", "SYSTEM",
                "e", "END"
        ), Map.of("sys1", "Gọi API"));

        List<Map<String, Object>> errors = new ArrayList<>();
        engine.validate(ctx, errors, new ArrayList<>());

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).get("code")).isEqualTo("NODE_TYPE_NOT_ALLOWED");
        assertThat(errors.get(0).get("nodeId")).isEqualTo("sys1");
        assertThat((String) errors.get(0).get("message")).contains("Gọi API");
    }
}
