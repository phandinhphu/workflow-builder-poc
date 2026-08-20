package com.acme.workflow.identity.domain;

import java.io.Serializable;
import java.util.Objects;

public class RolePermissionId implements Serializable {
    public String roleId;
    public String permissionCode;
    public RolePermissionId(){}
    public RolePermissionId(String roleId,String permissionCode){this.roleId=roleId;this.permissionCode=permissionCode;}
    @Override public boolean equals(Object o){return o instanceof RolePermissionId r&&Objects.equals(roleId,r.roleId)&&Objects.equals(permissionCode,r.permissionCode);}
    @Override public int hashCode(){return Objects.hash(roleId,permissionCode);}
}
