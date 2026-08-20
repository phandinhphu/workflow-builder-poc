package com.acme.workflow.audit.repository;
import com.acme.workflow.audit.domain.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
public interface AuditLogRepository extends JpaRepository<AuditLogEntity,String>,JpaSpecificationExecutor<AuditLogEntity>{}
