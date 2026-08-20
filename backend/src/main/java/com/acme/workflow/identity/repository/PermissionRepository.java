package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PermissionRepository extends JpaRepository<Permission,String>{}
