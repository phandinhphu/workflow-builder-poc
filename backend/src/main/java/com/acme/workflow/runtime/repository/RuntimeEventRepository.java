package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.RuntimeEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface RuntimeEventRepository extends JpaRepository<RuntimeEventEntity,String>{List<RuntimeEventEntity>findByInstanceIdOrderByCreatedAtAsc(String instanceId);}
