package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.SystemRole;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface SystemRoleRepository extends JpaRepository<SystemRole,String>{Optional<SystemRole>findByCode(String code);List<SystemRole>findAllByOrderByNameAsc();}
