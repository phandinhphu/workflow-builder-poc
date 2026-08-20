package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.HrmUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface HrmUserRepository extends JpaRepository<HrmUser,String>{Optional<HrmUser>findByUsername(String username);List<HrmUser>findByStatusOrderByDisplayNameAsc(String status);List<HrmUser>findByOrganizationUnitIdIn(Collection<String>orgIds);long countByOrganizationUnitId(String orgId);}
