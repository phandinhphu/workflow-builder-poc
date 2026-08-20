package com.acme.workflow.integration.repository;

import com.acme.workflow.integration.domain.ConnectorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ConnectorRepository extends JpaRepository<ConnectorEntity, String> {
    Optional<ConnectorEntity> findByConnectorKey(String key);
    List<ConnectorEntity> findAllByOrderByNameAsc();
}
