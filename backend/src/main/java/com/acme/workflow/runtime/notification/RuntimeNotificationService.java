package com.acme.workflow.runtime.notification;

import com.acme.workflow.common.Ids;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.runtime.RuntimeValueResolver;
import com.acme.workflow.runtime.domain.NotificationDeliveryEntity;
import com.acme.workflow.runtime.domain.WorkflowTaskEntity;
import com.acme.workflow.runtime.repository.NotificationDeliveryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
public class RuntimeNotificationService {

    private final NotificationDeliveryRepository notifications;
    private final DirectoryService directory;
    private final RuntimeValueResolver resolver;
    private final Jsons jsons;

    public RuntimeNotificationService(NotificationDeliveryRepository notifications,
                                      DirectoryService directory,
                                      RuntimeValueResolver resolver,
                                      Jsons jsons) {
        this.notifications = notifications;
        this.directory = directory;
        this.resolver = resolver;
        this.jsons = jsons;
    }

    public ObjectNode executeNotification(String instanceId, String peId, JsonNode node, ObjectNode context,
                                          List<String> recipients) {
        JsonNode config = node.path("config");
        List<String> channels = new ArrayList<>();
        if (config.has("channels") && config.path("channels").isArray() && !config.path("channels").isEmpty()) {
            config.path("channels").forEach(c -> channels.add(c.asText()));
        } else {
            channels.add("inapp");
        }

        int totalDeliveries = 0;
        log.info("[executeNotification] Resolved {} recipients for nodeId={}: {}", recipients.size(), node.path("id").asText(), recipients);

        for (String recipientId : recipients) {
            ObjectNode recipientContext = context.deepCopy();
            try {
                ObjectNode u = (ObjectNode) jsons.value(directory.user(recipientId));
                if (!u.has("name") && u.has("displayName")) u.set("name", u.get("displayName"));
                recipientContext.set("notifiedParticipant", u);
                recipientContext.set("participant", u);
            } catch (Exception ignored) {
                ObjectNode fallbackU = jsons.object().put("id", recipientId).put("name", recipientId).put("displayName", recipientId);
                recipientContext.set("notifiedParticipant", fallbackU);
                recipientContext.set("participant", fallbackU);
            }
            String title = resolver.render(config.path("title").asText(node.path("name").asText()), recipientContext);
            String body = resolver.render(config.path("bodyTemplate").asText(config.path("message").asText()), recipientContext);
            for (String channel : channels) {
                insertNotification(instanceId, null, recipientId, channel, title, body,
                        "node:" + node.path("id").asText() + ":" + peId + ":" + recipientId + ":" + channel);
                totalDeliveries++;
            }
        }
        return jsons.object().put("recipientCount", recipients.size()).put("deliveryCount", totalDeliveries);
    }

    public void sendParticipantStart(ObjectNode definition, String instanceId, String peId, Map<String, Object> user,
                                     ObjectNode variables) {
        JsonNode config = definition.path("participantNotification");
        if (!config.path("enabled").asBoolean())
            return;
        ObjectNode context = jsons.object();
        context.set("variables", variables);
        context.set("participant", jsons.value(user));
        config.path("channels")
                .forEach(channel -> insertNotification(instanceId, null, (String) user.get("id"), channel.asText(),
                        resolver.render(config.path("titleTemplate").asText(), context),
                        resolver.render(config.path("bodyTemplate").asText(), context),
                        "start:" + instanceId + ":" + peId + ":" + channel.asText()));
    }

    public void sendTaskNotification(String instanceId, WorkflowTaskEntity task, JsonNode channels,
                                     List<String> recipients, String stepName, String workflowName) {
        log.info("sendTaskNotification: instanceId={}, taskId={}, workflowName={}, stepName={}, channels={}, recipients={}",
                instanceId, task.id, workflowName, stepName, channels, recipients);

        List<String> channelList = new ArrayList<>();
        if (channels != null && channels.isArray() && !channels.isEmpty()) {
            channels.forEach(channel -> channelList.add(channel.asText()));
        } else {
            channelList.add("inapp");
        }

        String notificationBody = buildTaskNotificationBody(task, stepName, workflowName);
        channelList.forEach(channel -> recipients.forEach(
                recipient -> insertNotification(instanceId, task.id, recipient, channel, task.title,
                        notificationBody, "task:" + task.id + ":" + recipient + ":" + channel)));
    }

    public void sendApprovalRejectionNotification(WorkflowTaskEntity task, ObjectNode resolution,
                                                 String rejectorName, String reason, String recipientId) {
        if (recipientId == null)
            return;

        String title = "Yêu cầu đã bị từ chối: " + task.title;
        String body = rejectorName + " đã từ chối yêu cầu '" + task.title + "'.\nLý do: " + reason;
        LinkedHashSet<String> channels = new LinkedHashSet<>();
        channels.add("inapp");
        JsonNode configuredChannels = resolution.path("notificationChannels");
        if (configuredChannels.isArray())
            configuredChannels.forEach(channel -> channels.add(channel.asText().toLowerCase(Locale.ROOT)));
        for (String channel : channels) {
            insertNotification(task.instanceId, task.id, recipientId, channel, title, body,
                    "approval-rejected:" + task.id + ":" + recipientId + ":" + channel);
        }
    }

    public void insertNotification(String instanceId, String taskId, String recipient, String channel, String title,
                                   String body, String dedup) {
        if (recipient == null || notifications.existsByDedupKey(dedup))
            return;
        NotificationDeliveryEntity notice = new NotificationDeliveryEntity();
        notice.id = Ids.uuid();
        notice.instanceId = instanceId;
        notice.taskId = taskId;
        notice.recipientId = recipient;
        notice.channel = channel.toLowerCase(Locale.ROOT);
        notice.titleText = title == null ? "" : title;
        notice.bodyText = body == null ? "" : body;
        notice.dedupKey = dedup;
        notice.createdAt = Instant.now();
        notice.deliveryStatus = "inapp".equals(notice.channel) ? "SENT" : "PENDING";
        notice.sentAt = "SENT".equals(notice.deliveryStatus) ? notice.createdAt : null;
        notice.nextAttemptAt = "PENDING".equals(notice.deliveryStatus) ? notice.createdAt : null;
        notifications.save(notice);
    }

    private String buildTaskNotificationBody(WorkflowTaskEntity task, String stepName, String workflowName) {
        StringBuilder sb = new StringBuilder();
        if (workflowName != null && !workflowName.isBlank())
            sb.append("Quy trình: ").append(workflowName).append("\n");
        if (stepName != null && !stepName.isBlank())
            sb.append("Bước: ").append(stepName).append("\n");
        if (sb.length() > 0 && task.description != null && !task.description.isBlank())
            sb.append("---\n");
        if (task.description != null && !task.description.isBlank())
            sb.append(task.description);
        return sb.toString();
    }
}
