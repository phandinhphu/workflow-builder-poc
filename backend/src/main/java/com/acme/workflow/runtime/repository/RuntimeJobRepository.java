package com.acme.workflow.runtime.repository;

import com.acme.workflow.runtime.domain.RuntimeJobEntity;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface RuntimeJobRepository extends JpaRepository<RuntimeJobEntity, String> {
    boolean existsByDedupKey(String dedupKey);
    List<RuntimeJobEntity> findTop100ByStateAndDueAtLessThanEqualOrderByDueAtAsc(String state, Instant dueAt);
    List<RuntimeJobEntity> findByInstanceIdOrderByCreatedAtAsc(String instanceId);

    @Modifying
    @Query("update RuntimeJobEntity j set j.state='CANCELLED', j.completedAt=:now where j.instanceId=:instanceId and j.state='PENDING'")
    int cancelPending(@Param("instanceId") String instanceId, @Param("now") Instant now);
}
