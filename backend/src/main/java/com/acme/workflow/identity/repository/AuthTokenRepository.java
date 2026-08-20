package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;import java.util.*;
public interface AuthTokenRepository extends JpaRepository<AuthToken,String>{Optional<AuthToken>findByTokenHashAndExpiresAtAfter(String hash,Instant now);long deleteByExpiresAtBefore(Instant now);}
