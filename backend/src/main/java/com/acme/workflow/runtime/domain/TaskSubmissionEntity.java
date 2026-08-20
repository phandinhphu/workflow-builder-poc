package com.acme.workflow.runtime.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="task_submissions")
public class TaskSubmissionEntity {
    @Id @Column(length=36) public String id;
    @Column(name="task_id",nullable=false,length=36) public String taskId;
    @Column(name="revision_no",nullable=false) public int revisionNo;
    @Column(nullable=false,length=30) public String action;
    @Column(name="actor_id",nullable=false,length=36) public String actorId;
    @Lob @Column(name="form_data",nullable=false,columnDefinition="LONGTEXT") public String formData;
    @Column(name="comment_text",length=2000) public String commentText;
    @Column(name="created_at",nullable=false) public Instant createdAt;
}
