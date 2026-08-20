package com.acme.workflow.auth;

import com.acme.workflow.common.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthAndPermissionIT {
    @Autowired AuthController auth;
    @Autowired PermissionService permissions;

    @Test
    void authenticatesSeedAdminAndEnforcesOrganizationScope(){
        var login=auth.login(new AuthController.LoginRequest("admin","admin123"));
        assertThat(login.get("token")).isNotNull();
        assertThat(permissions.has("U000","ROLE_MANAGE",null)).isTrue();
        assertThat(permissions.has("U001","USER_MANAGE","ORG-TECH-BE")).isTrue();
        assertThat(permissions.has("U002","USER_MANAGE","ORG-TECH-BE")).isFalse();
        assertThatThrownBy(()->permissions.require("U002","USER_MANAGE","ORG-TECH-BE")).isInstanceOf(ApiException.class);
    }
}
