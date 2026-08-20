package com.acme.workflow.auth;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.identity.repository.RolePermissionRepository;
import com.acme.workflow.identity.repository.UserRoleAssignmentRepository;
import org.springframework.stereotype.Service;

@Service
public class PermissionService {
    private final UserRoleAssignmentRepository assignments;
    private final RolePermissionRepository rolePermissions;
    private final OrganizationUnitRepository organizations;

    public PermissionService(UserRoleAssignmentRepository assignments,RolePermissionRepository rolePermissions,OrganizationUnitRepository organizations) {this.assignments=assignments;this.rolePermissions=rolePermissions;this.organizations=organizations;}

    public boolean has(String userId, String permission, String targetOrgId) {
        var target=targetOrgId==null?null:organizations.findById(targetOrgId).orElse(null);
        return assignments.findByUserId(userId).stream().anyMatch(assignment->{
            if(!rolePermissions.existsByRoleIdAndPermissionCode(assignment.roleId,permission))return false;
            if(assignment.organizationScopeId==null)return true;
            if(target==null)return false;
            return organizations.findById(assignment.organizationScopeId).map(scope->target.hierarchyPath.startsWith(scope.hierarchyPath)).orElse(false);
        });
    }

    public void require(String userId, String permission, String targetOrgId) {
        if (!has(userId, permission, targetOrgId)) {
            throw ApiException.forbidden("Thiếu quyền " + permission + " trong phạm vi tổ chức yêu cầu");
        }
    }
}
