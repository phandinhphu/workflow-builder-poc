package com.acme.workflow.identity.repository;

import com.acme.workflow.identity.domain.DirectoryGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface DirectoryGroupRepository extends JpaRepository<DirectoryGroup, String> {
    Optional<DirectoryGroup> findByCode(String code);
    List<DirectoryGroup> findAllByOrderByNameAsc();
}
