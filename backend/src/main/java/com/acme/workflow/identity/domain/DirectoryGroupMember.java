package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@IdClass(DirectoryGroupMemberId.class)
@Table(name = "directory_group_members")
public class DirectoryGroupMember {
    @Id @Column(name = "group_id", length = 36) public String groupId;
    @Id @Column(name = "user_id", length = 36) public String userId;
    @Column(name = "created_at", nullable = false) public Instant createdAt;
}
