package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "wait_subscriptions")
public class WaitSubscriptionEntity {
    @Id @Column(length = 36) public String id;
    @Column(name = "instance_id", nullable = false, length = 36) public String instanceId;
    @Column(name = "participant_execution_id", length = 36) public String participantExecutionId;
    @Column(name = "node_execution_id", nullable = false, length = 36) public String nodeExecutionId;
    @Column(name = "event_name", nullable = false, length = 100) public String eventName;
    @Column(name = "correlation_key", nullable = false, length = 500) public String correlationKey;
    @Column(nullable = false, length = 20) public String state;
    @Column(name = "expires_at") public Instant expiresAt;
    @Lob @Column(name = "event_payload", columnDefinition = "LONGTEXT") public String eventPayload;
    @Column(name = "consumed_at") public Instant consumedAt;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
}
