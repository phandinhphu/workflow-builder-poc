package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.UserRoleAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignment,String>{List<UserRoleAssignment>findByUserId(String userId);List<UserRoleAssignment>findByRoleIdIn(Collection<String>roleIds);void deleteByUserId(String userId);}
