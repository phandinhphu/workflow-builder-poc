package com.acme.workflow.workflow.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="workflow_versions",uniqueConstraints=@UniqueConstraint(columnNames={"workflow_id","version_no"}))
public class WorkflowVersionEntity {
    @Id @Column(length=36) public String id;
    @Column(name="workflow_id",nullable=false,length=36) public String workflowId;
    @Column(name="version_no",nullable=false,length=30) public String versionNo;
    @Column(nullable=false,length=20) public String status;
    @Lob @Column(name="definition_snapshot",nullable=false,columnDefinition="LONGTEXT") public String definitionSnapshot;
    @Column(nullable=false,length=64) public String checksum;
    @Lob @Column(name="validation_report",columnDefinition="LONGTEXT") public String validationReport;
    @Column(name="author_id",nullable=false,length=36) public String authorId;
    @Column(name="published_at") public Instant publishedAt;
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
}
