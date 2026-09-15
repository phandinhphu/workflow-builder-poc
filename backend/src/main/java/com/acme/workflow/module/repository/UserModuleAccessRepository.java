package com.acme.workflow.module.repository;

import com.acme.workflow.module.domain.UserModuleAccessEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserModuleAccessRepository extends JpaRepository<UserModuleAccessEntity, String> {
    List<UserModuleAccessEntity> findByUserId(String userId);
    List<UserModuleAccessEntity> findByModuleId(String moduleId);
    Optional<UserModuleAccessEntity> findByUserIdAndModuleId(String userId, String moduleId);
    void deleteByUserIdAndModuleId(String userId, String moduleId);
    boolean existsByUserIdAndModuleId(String userId, String moduleId);
}
