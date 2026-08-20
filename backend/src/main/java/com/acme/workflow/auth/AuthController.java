package com.acme.workflow.auth;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Ids;
import com.acme.workflow.identity.domain.AuthToken;
import com.acme.workflow.identity.repository.AuthTokenRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final HrmUserRepository users;
    private final AuthTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final CurrentUserService currentUser;
    private final int tokenHours;

    public AuthController(HrmUserRepository users,AuthTokenRepository tokens, PasswordEncoder encoder, CurrentUserService currentUser,
                          @Value("${app.auth-token-hours}") int tokenHours) {
        this.users=users;this.tokens=tokens; this.encoder = encoder; this.currentUser = currentUser; this.tokenHours = tokenHours;
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request) {
        var user=users.findByUsername(request.username()).orElse(null);
        if (user==null || !"ACTIVE".equals(user.status) || !encoder.matches(request.password(),user.passwordHash)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Tên đăng nhập hoặc mật khẩu không đúng");
        }
        String userId = user.id;
        String token = UUID.randomUUID().toString() + UUID.randomUUID();
        Instant expiresAt = Instant.now().plus(tokenHours, ChronoUnit.HOURS);
        AuthToken entity=new AuthToken();entity.tokenHash=Ids.sha256(token);entity.userId=userId;entity.expiresAt=expiresAt;tokens.save(entity);
        return Map.of("token", token, "expiresAt", expiresAt.toString(), "userId", userId);
    }

    @GetMapping("/me")
    public Map<String, Object> me() { return currentUser.profile(); }

    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        if (authorization != null && authorization.startsWith("Bearer ")) tokens.deleteById(Ids.sha256(authorization.substring(7)));
    }
}
