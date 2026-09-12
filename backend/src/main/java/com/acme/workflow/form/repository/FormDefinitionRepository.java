package com.acme.workflow.form.repository;

import com.acme.workflow.form.domain.FormDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FormDefinitionRepository extends JpaRepository<FormDefinitionEntity, String> {
    List<FormDefinitionEntity> findByStatusNotOrderByUpdatedAtDesc(String status);
    List<FormDefinitionEntity> findByStatus(String status);
    Optional<FormDefinitionEntity> findByCode(String code);
    boolean existsByCode(String code);
}
