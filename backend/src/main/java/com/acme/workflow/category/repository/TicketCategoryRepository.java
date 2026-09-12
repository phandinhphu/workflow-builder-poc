package com.acme.workflow.category.repository;

import com.acme.workflow.category.domain.TicketCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketCategoryRepository extends JpaRepository<TicketCategoryEntity, String> {
    Optional<TicketCategoryEntity> findByIdAndDeletedAtIsNull(String id);

    boolean existsByCodeAndDeletedAtIsNull(String code);

    boolean existsByCodeAndIdNotAndDeletedAtIsNull(String code, String id);

    List<TicketCategoryEntity> findByDeletedAtIsNullOrderByCreatedAtDesc();

    List<TicketCategoryEntity> findByIsActiveTrueAndDeletedAtIsNullOrderByCreatedAtDesc();

    long countByFormVersionIdAndDeletedAtIsNull(String formVersionId);

    long countByWorkflowExecutableIdAndDeletedAtIsNull(String workflowExecutableId);
}
