package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="notification_deliveries")
public class NotificationDeliveryEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",length=36) public String instanceId;
    @Column(name="task_id",length=36) public String taskId;
    @Column(name="recipient_id",nullable=false,length=36) public String recipientId;
    @Column(nullable=false,length=30) public String channel;
    @Column(name="title_text",nullable=false,length=500) public String titleText;
    @Lob @Column(name="body_text",nullable=false,columnDefinition="LONGTEXT") public String bodyText;
    @Column(name="delivery_status",nullable=false,length=30) public String deliveryStatus;
    @Column(name="dedup_key",nullable=false,unique=true) public String dedupKey;
    @Column(name="created_at",nullable=false) public Instant createdAt;
    @Column(name="sent_at") public Instant sentAt;
    @Column(nullable=false) public int attempts;
    @Column(name="next_attempt_at") public Instant nextAttemptAt;
    @Column(name="last_error",length=2000) public String lastError;
    @Column(name="provider_message_id",length=255) public String providerMessageId;
    @Column(name="read_at") public Instant readAt;
}
