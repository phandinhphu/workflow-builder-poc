package com.acme.workflow.integration.repository;

import com.acme.workflow.integration.domain.CredentialReferenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface CredentialReferenceRepository extends JpaRepository<CredentialReferenceEntity, String> {
    List<CredentialReferenceEntity> findAllByOrderByNameAsc();
}
