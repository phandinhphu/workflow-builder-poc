package com.acme.workflow.auth;

import com.acme.workflow.common.Ids;
import com.acme.workflow.identity.repository.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.*;

@Component
public class TokenAuthenticationFilter extends OncePerRequestFilter {
    private final AuthTokenRepository tokens;
    private final HrmUserRepository users;
    private final UserRoleAssignmentRepository assignments;
    private final SystemRoleRepository roles;
    private final boolean devHeaderEnabled;

    public TokenAuthenticationFilter(AuthTokenRepository tokens, HrmUserRepository users,
                                     UserRoleAssignmentRepository assignments, SystemRoleRepository roles,
                                     @Value("${app.dev-user-header-enabled:false}") boolean devHeaderEnabled) {
        this.tokens = tokens; this.users = users; this.assignments = assignments; this.roles = roles; this.devHeaderEnabled = devHeaderEnabled;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        String userId = bearerUser(request);
        if (userId == null && devHeaderEnabled) userId = trim(request.getHeader("X-User-Id"));
        if (userId != null && users.findById(userId).filter(user -> "ACTIVE".equals(user.status)).isPresent()) {
            List<SimpleGrantedAuthority> authorities = assignments.findByUserId(userId).stream()
                    .map(assignment -> roles.findById(assignment.roleId).map(role -> new SimpleGrantedAuthority("ROLE_" + role.code)).orElse(null))
                    .filter(Objects::nonNull).toList();
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(userId, null, authorities));
        }
        chain.doFilter(request, response);
    }

    private String bearerUser(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return tokens.findByTokenHashAndExpiresAtAfter(Ids.sha256(header.substring(7)), Instant.now()).map(token -> token.userId).orElse(null);
    }
    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
