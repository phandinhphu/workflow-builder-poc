package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="participant_executions")
public class ParticipantExecutionEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",nullable=false,length=36) public String instanceId;
    @Column(name="user_id",nullable=false,length=36) public String userId;
    @Lob @Column(name="participant_snapshot",nullable=false,columnDefinition="LONGTEXT") public String participantSnapshot;
    @Column(nullable=false,length=20) public String status;
    @Column(name="current_node_id",length=100) public String currentNodeId;
    @Column(name="iteration_no",nullable=false) public int iterationNo;
    @Column(name="started_at",nullable=false) public Instant startedAt;
    @Column(name="completed_at") public Instant completedAt;
}
