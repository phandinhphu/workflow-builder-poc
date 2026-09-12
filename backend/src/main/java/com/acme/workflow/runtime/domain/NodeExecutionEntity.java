package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="node_executions")
public class NodeExecutionEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",nullable=false,length=36) public String instanceId;
    @Column(name="participant_execution_id",length=36) public String participantExecutionId;
    @Column(name="node_id",nullable=false,length=100) public String nodeId;
    @Column(name="node_type",nullable=false,length=50) public String nodeType;
    @Column(name="iteration_no",nullable=false) public int iterationNo;
    @Column(nullable=false,length=20) public String state;
    @Column(name="outcome_port",length=100) public String outcomePort;
    @Lob @Column(name="input_snapshot",nullable=false,columnDefinition="LONGTEXT") public String inputSnapshot;
    @Lob @Column(name="output_data",nullable=false,columnDefinition="LONGTEXT") public String outputData="{}";
    @Lob @Column(name="error_data",columnDefinition="LONGTEXT") public String errorData;
    @Column(name="started_at",nullable=false) public Instant startedAt;
    @Column(name="completed_at") public Instant completedAt;
    @Column(name="execution_order",nullable=false) public int executionOrder;
}
