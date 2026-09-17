package com.acme.workflow.module;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ModuleApiControllerIT {

    @Autowired
    private MockMvc mvc;

    @Test
    @DisplayName("GET /api/v1/modules returns all 8 active modules ordered by sortOrder")
    void testListActiveModules() throws Exception {
        mvc.perform(get("/api/v1/modules").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].id").value("MOD_GENERAL"))
                .andExpect(jsonPath("$[0].name").value("Module Chung"))
                .andExpect(jsonPath("$[1].id").value("MOD_HR"))
                .andExpect(jsonPath("$[1].departmentId").value("ORG-HR"))
                .andExpect(jsonPath("$[1].departmentName").value("Khối Nhân sự"))
                .andExpect(jsonPath("$[2].id").value("MOD_IT"))
                .andExpect(jsonPath("$[2].departmentId").value("ORG-TECH"))
                .andExpect(jsonPath("$[2].departmentName").value("Khối Công nghệ"));
    }

    @Test
    @DisplayName("GET /api/modules alias returns active modules")
    void testListActiveModulesAlias() throws Exception {
        mvc.perform(get("/api/modules").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8));
    }

    @Test
    @DisplayName("GET /api/v1/modules/{id} returns details with department name")
    void testGetModuleById() throws Exception {
        mvc.perform(get("/api/v1/modules/MOD_HR").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("MOD_HR"))
                .andExpect(jsonPath("$.name").value("Nhân sự"))
                .andExpect(jsonPath("$.departmentId").value("ORG-HR"))
                .andExpect(jsonPath("$.departmentName").value("Khối Nhân sự"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @DisplayName("GET /api/v1/modules/{id} returns 404 for non-existent module")
    void testGetModuleNotFound() throws Exception {
        mvc.perform(get("/api/v1/modules/MOD_NONEXISTENT").header("X-User-Id", "U000"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/users/me/modules as U001 (HR) returns MOD_HR (MANAGER) and MOD_GENERAL (EDITOR)")
    void testMyModulesForHrUser() throws Exception {
        mvc.perform(get("/api/v1/users/me/modules").header("X-User-Id", "U001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.moduleId == 'MOD_HR')].accessLevel").value(contains("MANAGER")))
                .andExpect(jsonPath("$[?(@.moduleId == 'MOD_HR')].departmentName").value(contains("Khối Nhân sự")))
                .andExpect(jsonPath("$[?(@.moduleId == 'MOD_GENERAL')].accessLevel").value(contains("EDITOR")));
    }

    @Test
    @DisplayName("GET /api/v1/users/me/modules as U002 (IT) returns MOD_IT (MANAGER) and MOD_GENERAL (EDITOR)")
    void testMyModulesForItUser() throws Exception {
        mvc.perform(get("/api/v1/users/me/modules").header("X-User-Id", "U002"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.moduleId == 'MOD_IT')].accessLevel").value(contains("MANAGER")))
                .andExpect(jsonPath("$[?(@.moduleId == 'MOD_GENERAL')].accessLevel").value(contains("EDITOR")));
    }

    @Test
    @DisplayName("GET /api/v1/users/me/modules as Admin (U000) returns all 8 modules with MANAGER level")
    void testMyModulesForAdmin() throws Exception {
        mvc.perform(get("/api/v1/users/me/modules").header("X-User-Id", "U000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[*].accessLevel", everyItem(is("MANAGER"))));
    }

    @Test
    @DisplayName("GET /api/v1/modules/my alias returns user module access list")
    void testMyModulesAlias() throws Exception {
        mvc.perform(get("/api/v1/modules/my").header("X-User-Id", "U001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }
}
