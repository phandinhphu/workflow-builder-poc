package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="auth_tokens")
public class AuthToken {
    @Id @Column(name="token_hash",length=64) public String tokenHash;
    @Column(name="user_id",nullable=false,length=36) public String userId;
    @Column(name="expires_at",nullable=false) public Instant expiresAt;
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
}
