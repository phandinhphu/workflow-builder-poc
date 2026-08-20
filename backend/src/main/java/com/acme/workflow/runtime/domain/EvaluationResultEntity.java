package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name="evaluation_results")
public class EvaluationResultEntity {
    @Id @Column(length=36) public String id;
    @Column(name="instance_id",nullable=false,length=36) public String instanceId;
    @Column(name="participant_user_id",nullable=false,length=36) public String participantUserId;
    @Column(name="period_key",nullable=false,length=100) public String periodKey;
    @Column(name="self_score",precision=10,scale=2) public BigDecimal selfScore;
    @Column(name="manager_score",precision=10,scale=2) public BigDecimal managerScore;
    @Column(name="manager_competency",length=100) public String managerCompetency;
    @Column(name="evaluation_valid",nullable=false) public boolean evaluationValid;
    @Lob @Column(name="result_data",nullable=false,columnDefinition="LONGTEXT") public String resultData;
    @Column(nullable=false,length=30) public String status;
    @Column(name="created_at",nullable=false) public Instant createdAt;
    @Column(name="updated_at",nullable=false) public Instant updatedAt;
}
