package com.acme.workflow.identity.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="hrm_users")
public class HrmUser {
    @Id @Column(length=36) public String id;
    @Column(name="employee_code",nullable=false,unique=true,length=64) public String employeeCode;
    @Column(nullable=false,unique=true,length=100) public String username;
    @Column(name="password_hash",nullable=false) public String passwordHash;
    @Column(name="display_name",nullable=false) public String displayName;
    @Column(nullable=false,unique=true) public String email;
    @Column(length=50) public String phone;
    @Column(name="job_title") public String jobTitle;
    @Column(name="organization_unit_id",nullable=false,length=36) public String organizationUnitId;
    @Column(name="manager_id",length=36) public String managerId;
    @Column(name="employment_level",length=100) public String employmentLevel;
    @Column(nullable=false,length=20) public String status="ACTIVE";
    @Column(name="created_at",nullable=false,insertable=false,updatable=false) public Instant createdAt;
    @Column(name="updated_at",nullable=false,insertable=false) public Instant updatedAt;
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
}
