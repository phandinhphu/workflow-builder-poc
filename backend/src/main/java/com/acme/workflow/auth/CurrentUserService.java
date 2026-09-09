package com.acme.workflow.auth;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Ids;
import com.acme.workflow.identity.domain.HrmUser;
import com.acme.workflow.identity.domain.SystemRole;
import com.acme.workflow.identity.domain.UserRoleAssignment;
import com.acme.workflow.identity.repository.AuthTokenRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.identity.repository.RolePermissionRepository;
import com.acme.workflow.identity.repository.SystemRoleRepository;
import com.acme.workflow.identity.repository.UserRoleAssignmentRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class CurrentUserService {
    private final AuthTokenRepository tokens;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final UserRoleAssignmentRepository assignments;
    private final RolePermissionRepository rolePermissions;
    private final SystemRoleRepository roles;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final boolean devHeaderEnabled;

    public CurrentUserService(AuthTokenRepository tokens, HrmUserRepository users, OrganizationUnitRepository organizations,
                              UserRoleAssignmentRepository assignments, RolePermissionRepository rolePermissions, SystemRoleRepository roles,
                              ObjectProvider<HttpServletRequest> requestProvider,
                              @Value("${app.dev-user-header-enabled}") boolean devHeaderEnabled) {
        this.tokens = tokens;
        this.users = users;
        this.organizations = organizations;
        this.assignments = assignments;
        this.rolePermissions = rolePermissions;
        this.roles = roles;
        this.requestProvider = requestProvider;
        this.devHeaderEnabled = devHeaderEnabled;
    }

    public String id() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && authentication.getPrincipal() instanceof String principal) return principal;
        HttpServletRequest request = requestProvider.getIfAvailable();
        if (request != null) {
            String bearer = request.getHeader("Authorization");
            if (bearer != null && bearer.startsWith("Bearer ")) {
                String tokenHash = Ids.sha256(bearer.substring(7));
                var token=tokens.findByTokenHashAndExpiresAtAfter(tokenHash,Instant.now());
                if(token.isPresent())return token.get().userId;
            }
            if (devHeaderEnabled) {
                String header = request.getHeader("X-User-Id");
                if (header != null && !header.isBlank()) return header;
            }
        }
        if (devHeaderEnabled) return "U000";
        throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Yêu cầu đăng nhập");
    }

    public Map<String, Object> profile() {
        HrmUser user=users.findById(id()).orElseThrow(()->ApiException.notFound("Không tìm thấy người dùng hiện tại"));
        Map<String,Object>profile=new LinkedHashMap<>();
        profile.put("id",user.id);
        profile.put("username",user.username);
        profile.put("displayName",user.displayName);
        profile.put("email",user.email);
        profile.put("jobTitle",user.jobTitle);
        profile.put("organizationUnitId",user.organizationUnitId);
        profile.put("organizationName",organizations.findById(user.organizationUnitId).map(o->o.name).orElse(null));
        profile.put("status",user.status);

        List<UserRoleAssignment> userAssignments = assignments.findByUserId(user.id);
        List<String> roleCodes = userAssignments.stream()
                .map(a -> roles.findById(a.roleId).map(r -> r.code).orElse(null))
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        List<String> roleIds = userAssignments.stream().map(a -> a.roleId).toList();
        List<String> permissionCodes = roleIds.isEmpty() ? List.of() : rolePermissions.findByRoleIdIn(roleIds).stream()
                .map(rp -> rp.permissionCode)
                .distinct()
                .toList();

        profile.put("roles", roleCodes);
        profile.put("permissions", permissionCodes);
        return profile;
    }
}
