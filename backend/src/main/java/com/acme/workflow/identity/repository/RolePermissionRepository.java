package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RolePermissionRepository extends JpaRepository<RolePermission,RolePermissionId>{List<RolePermission>findByRoleId(String roleId);List<RolePermission>findByRoleIdIn(Collection<String>roleIds);void deleteByRoleId(String roleId);boolean existsByRoleIdAndPermissionCode(String roleId,String permissionCode);}
