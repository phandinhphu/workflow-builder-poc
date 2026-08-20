package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.NotificationDeliveryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface NotificationDeliveryRepository extends JpaRepository<NotificationDeliveryEntity,String>{
    boolean existsByDedupKey(String key);
    List<NotificationDeliveryEntity> findTop100ByDeliveryStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(Collection<String> statuses, Instant now);
    List<NotificationDeliveryEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId);
    List<NotificationDeliveryEntity> findByInstanceIdOrderByCreatedAtAsc(String instanceId);
}
