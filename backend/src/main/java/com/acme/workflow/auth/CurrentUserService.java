package com.acme.workflow.auth;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Ids;
import com.acme.workflow.identity.domain.HrmUser;
import com.acme.workflow.identity.repository.AuthTokenRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class CurrentUserService {
    private final AuthTokenRepository tokens;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final boolean devHeaderEnabled;

    public CurrentUserService(AuthTokenRepository tokens,HrmUserRepository users,OrganizationUnitRepository organizations,ObjectProvider<HttpServletRequest> requestProvider,
                              @Value("${app.dev-user-header-enabled}") boolean devHeaderEnabled) {
        this.tokens=tokens;this.users=users;this.organizations=organizations;
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
        Map<String,Object>profile=new LinkedHashMap<>();profile.put("id",user.id);profile.put("username",user.username);profile.put("displayName",user.displayName);
        profile.put("email",user.email);profile.put("jobTitle",user.jobTitle);profile.put("organizationUnitId",user.organizationUnitId);
        profile.put("organizationName",organizations.findById(user.organizationUnitId).map(o->o.name).orElse(null));profile.put("status",user.status);return profile;
    }
}
