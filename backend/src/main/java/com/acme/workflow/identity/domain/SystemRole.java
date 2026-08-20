package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="system_roles")
public class SystemRole {
    @Id @Column(length=36) public String id;
    @Column(nullable=false,unique=true,length=80) public String code;
    @Column(nullable=false) public String name;
    @Column(length=1000) public String description;
    @Column(name="built_in",nullable=false) public boolean builtIn;
    @Column(nullable=false,length=20) public String status="ACTIVE";
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
}
