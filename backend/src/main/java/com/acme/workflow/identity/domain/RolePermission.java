package com.acme.workflow.identity.domain;

import jakarta.persistence.*;

@Entity
@Table(name="role_permissions")
@IdClass(RolePermissionId.class)
public class RolePermission {
    @Id @Column(name="role_id",length=36) public String roleId;
    @Id @Column(name="permission_code",length=100) public String permissionCode;
    public RolePermission(){}
    public RolePermission(String roleId,String permissionCode){this.roleId=roleId;this.permissionCode=permissionCode;}
}
