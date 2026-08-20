package com.acme.workflow.directory;

import com.acme.workflow.identity.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DirectoryJpaIT {
    @Autowired DirectoryService directory;
    @Autowired HrmUserRepository users;
    @Autowired OrganizationUnitRepository organizations;
    @Autowired SystemRoleRepository roles;
    @Autowired UserRoleAssignmentRepository assignments;

    @Test
    void managesHierarchicalOrganizationUsersAndIndependentSystemRoles(){
        Map<String,Object>team=directory.createOrganization(Map.of("id","ORG-TECH-PLATFORM","code","TECH-PLATFORM","name","Nhóm Nền tảng","unitType","TEAM","parentId","ORG-TECH-BE"));
        assertThat(team.get("hierarchyLevel")).isEqualTo(3);
        assertThat(String.valueOf(team.get("hierarchyPath"))).endsWith("/ORG-TECH-PLATFORM/");

        Map<String,Object>user=directory.createUser(Map.of("id","U-TEST-JPA","employeeCode","TEST-JPA","username","test.jpa","displayName","Nhân sự Test JPA","email","test.jpa@company.com","jobTitle","Platform Engineer","organizationUnitId","ORG-TECH-PLATFORM","managerId","U002","employmentLevel","Staff"));
        Map<String,Object>role=directory.createRole(Map.of("id","ROLE-TEST-JPA","code","TEST_OPERATOR","name","Test Operator","permissions",List.of("WORKFLOW_VIEW","INSTANCE_VIEW")));
        directory.assignRoles("U-TEST-JPA",List.of(Map.of("roleId",role.get("id"))));

        Map<String,Object>loaded=directory.user("U-TEST-JPA");
        assertThat(loaded.get("jobTitle")).isEqualTo("Platform Engineer");
        assertThat(((List<Map<String,Object>>)loaded.get("systemRoles")).stream().map(item->String.valueOf(item.get("code"))).toList()).containsExactly("TEST_OPERATOR");
        assertThat(users.findById("U-TEST-JPA")).isPresent();
        assertThat(organizations.findById("ORG-TECH-PLATFORM")).isPresent();
        assertThat(roles.findByCode("TEST_OPERATOR")).isPresent();
        assertThat(assignments.findByUserId("U-TEST-JPA")).hasSize(1);
    }

    @Test
    void returnsOrganizationTreeInHierarchyOrder(){
        List<Map<String,Object>>tree=directory.organizationTree();
        assertThat(tree).hasSize(1);
        assertThat(tree.getFirst().get("id")).isEqualTo("ORG-COMPANY");
        assertThat((List<?>)tree.getFirst().get("children")).isNotEmpty();
    }
}
