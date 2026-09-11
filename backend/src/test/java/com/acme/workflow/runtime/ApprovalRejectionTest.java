package com.acme.workflow.runtime;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.runtime.domain.NotificationDeliveryEntity;
import com.acme.workflow.runtime.repository.NotificationDeliveryRepository;
import com.acme.workflow.workflow.WorkflowService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class ApprovalRejectionTest {
    @Autowired WorkflowService workflows;
    @Autowired RuntimeEngineService engine;
    @Autowired RuntimeQueryService query;
    @Autowired NotificationDeliveryRepository notifications;
    @Autowired Jsons jsons;

    @Test
    void requiresReasonWhenRejectingApprovalTask() {
        String instanceId = startApproval("WF-REJECT-REASON-REQUIRED");
        Map<String, Object> task = pendingApproval(instanceId);
        engine.claim((String) task.get("id"));

        assertThatThrownBy(() -> engine.act((String) task.get("id"), "REJECT", jsons.object()))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("lý do");

        assertThat(task(instanceId).get("status")).isEqualTo("CLAIMED");
    }

    @Test
    void notifiesReviewedParticipantWithRejectionReason() {
        String instanceId = startApproval("WF-REJECT-REASON-NOTIFICATION");
        Map<String, Object> task = pendingApproval(instanceId);
        engine.claim((String) task.get("id"));

        ObjectNode request = jsons.object().put("comment", "Thông tin ngân sách chưa đầy đủ");
        engine.act((String) task.get("id"), "REJECT", request);

        List<NotificationDeliveryEntity> recipientNotifications = notifications
                .findByInstanceIdOrderByCreatedAtAsc(instanceId).stream()
                .filter(notice -> "U002".equals(notice.recipientId))
                .toList();
        assertThat(recipientNotifications).anySatisfy(notice -> {
            assertThat(notice.channel).isEqualTo("inapp");
            assertThat(notice.titleText).contains("bị từ chối");
            assertThat(notice.bodyText).contains("Thông tin ngân sách chưa đầy đủ");
        });
    }

    private String startApproval(String workflowId) {
        ObjectNode definition = jsons.object();
        definition.put("id", workflowId).put("name", "Quy trình phê duyệt").put("type", "Approval")
                .put("ownerId", "U000").put("draftVersion", "1.0");
        definition.putObject("trigger").put("type", "manual").putObject("config");
        definition.putArray("variables");
        var nodes = definition.putArray("nodes");
        node(nodes.addObject(), "start", "START", jsons.object());
        ObjectNode approvalConfig = jsons.object().put("title", "Phê duyệt yêu cầu");
        approvalConfig.putObject("assignee").put("type", "fixed").put("value", "U000");
        approvalConfig.putArray("channels").add("inapp");
        node(nodes.addObject(), "approval", "APPROVAL", approvalConfig);
        ObjectNode rejectedEnd = jsons.object();
        rejectedEnd.put("endType", "REJECTED");
        node(nodes.addObject(), "rejected", "END", rejectedEnd);
        var edges = definition.putArray("connections");
        edge(edges.addObject(), "c1", "start", "SUCCESS", "approval");
        edge(edges.addObject(), "c2", "approval", "REJECTED", "rejected");
        definition.putObject("settings").put("maxIterations", 10);
        workflows.create(definition);
        assertThat(workflows.validate(workflowId).get("valid")).isEqualTo(true);
        workflows.publish(workflowId);

        ObjectNode start = jsons.object();
        start.putArray("participantUserIds").add("U002");
        return (String) engine.start(workflowId, start).get("id");
    }

    private Map<String, Object> pendingApproval(String instanceId) {
        return query.tasks(null, null, null).stream()
                .filter(candidate -> instanceId.equals(candidate.get("workflowInstanceId"))
                        && "approval".equals(candidate.get("nodeId"))
                        && "PENDING".equals(candidate.get("status")))
                .findFirst()
                .orElseThrow();
    }

    private Map<String, Object> task(String instanceId) {
        return query.tasks(null, null, null).stream()
                .filter(candidate -> instanceId.equals(candidate.get("workflowInstanceId"))
                        && "approval".equals(candidate.get("nodeId")))
                .findFirst()
                .orElseThrow();
    }

    private void node(ObjectNode node, String id, String type, ObjectNode config) {
        node.put("id", id).put("type", type).put("name", id);
        node.set("config", config);
        node.putObject("position").put("x", 0).put("y", 0);
    }

    private void edge(ObjectNode edge, String id, String source, String port, String target) {
        edge.put("id", id).put("sourceNodeId", source).put("sourcePort", port).put("targetNodeId", target);
    }
}
