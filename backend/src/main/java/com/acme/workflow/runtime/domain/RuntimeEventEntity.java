package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="runtime_events")
public class RuntimeEventEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",nullable=false,length=36) public String instanceId;
    @Column(name="participant_execution_id",length=36) public String participantExecutionId;
    @Column(name="node_execution_id",length=36) public String nodeExecutionId;
    @Column(name="event_type",nullable=false,length=50) public String eventType;
    @Column(nullable=false,length=500) public String title;
    @Column(length=2000) public String description;
    @Column(name="event_status",nullable=false,length=30) public String eventStatus;
    @Column(name="actor_id",length=36) public String actorId;
    @Lob @Column(name="event_data",nullable=false,columnDefinition="LONGTEXT") public String eventData;
    @Column(name="created_at",nullable=false) public Instant createdAt;
}
