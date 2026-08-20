package com.acme.workflow.identity.domain;

import jakarta.persistence.*;

@Entity
@Table(name="permissions")
public class Permission {
    @Id @Column(length=100) public String code;
    @Column(nullable=false) public String name;
    @Column(length=1000) public String description;
}
