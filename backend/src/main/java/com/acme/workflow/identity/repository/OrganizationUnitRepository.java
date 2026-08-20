package com.acme.workflow.identity.repository;
import com.acme.workflow.identity.domain.OrganizationUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface OrganizationUnitRepository extends JpaRepository<OrganizationUnit,String>{Optional<OrganizationUnit>findByCode(String code);List<OrganizationUnit>findAllByOrderByHierarchyPathAsc();List<OrganizationUnit>findByHierarchyPathStartingWithOrderByHierarchyPathAsc(String path);}
