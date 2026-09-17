package com.acme.workflow.module.repository;

import com.acme.workflow.module.domain.ModuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<ModuleEntity, String> {
    List<ModuleEntity> findByIsActiveTrueOrderBySortOrderAsc();
    List<ModuleEntity> findAllByOrderBySortOrderAsc();
    List<ModuleEntity> findByDepartmentId(String departmentId);
}
