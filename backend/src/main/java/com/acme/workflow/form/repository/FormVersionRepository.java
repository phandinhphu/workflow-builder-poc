package com.acme.workflow.form.repository;

import com.acme.workflow.form.domain.FormVersionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FormVersionRepository extends JpaRepository<FormVersionEntity, String> {
    List<FormVersionEntity> findByFormDefinitionIdOrderByVersionNumberDesc(String formDefinitionId);
    Optional<FormVersionEntity> findByFormDefinitionIdAndVersionNumber(String formDefinitionId, int versionNumber);
    Optional<FormVersionEntity> findTopByFormDefinitionIdOrderByVersionNumberDesc(String formDefinitionId);
}
