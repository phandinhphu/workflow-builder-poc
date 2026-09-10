package com.acme.workflow.runtime.repository;

import com.acme.workflow.runtime.domain.RuntimeEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RuntimeEventRepository extends JpaRepository<RuntimeEventEntity, String> {
    List<RuntimeEventEntity> findByInstanceIdOrderByCreatedAtAsc(String instanceId);

    @Query("SELECT e FROM RuntimeEventEntity e WHERE e.instanceId = :instanceId ORDER BY e.createdAt ASC, e.id ASC")
    List<RuntimeEventEntity> findTimelineEvents(@Param("instanceId") String instanceId);
}
