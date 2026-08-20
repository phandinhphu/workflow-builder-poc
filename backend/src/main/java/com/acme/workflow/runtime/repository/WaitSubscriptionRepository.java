package com.acme.workflow.runtime.repository;

import com.acme.workflow.runtime.domain.WaitSubscriptionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface WaitSubscriptionRepository extends JpaRepository<WaitSubscriptionEntity, String> {
    Optional<WaitSubscriptionEntity> findFirstByEventNameAndCorrelationKeyAndState(String eventName, String correlationKey, String state);
    List<WaitSubscriptionEntity> findByInstanceIdOrderByCreatedAtAsc(String instanceId);
}
