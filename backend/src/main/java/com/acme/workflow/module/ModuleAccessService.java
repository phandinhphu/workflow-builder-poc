package com.acme.workflow.module;

import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.identity.domain.UserRoleAssignment;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.identity.repository.SystemRoleRepository;
import com.acme.workflow.identity.repository.UserRoleAssignmentRepository;
import com.acme.workflow.module.domain.ModuleEntity;
import com.acme.workflow.module.domain.UserModuleAccessEntity;
import com.acme.workflow.module.dto.UserModuleAccessResponse;
import com.acme.workflow.module.repository.ModuleRepository;
import com.acme.workflow.module.repository.UserModuleAccessRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ModuleAccessService {

    private final ModuleRepository moduleRepository;
    private final UserModuleAccessRepository userModuleAccessRepository;
    private final OrganizationUnitRepository organizationUnitRepository;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final SystemRoleRepository systemRoleRepository;
    private final PermissionService permissionService;

    public ModuleAccessService(
            ModuleRepository moduleRepository,
            UserModuleAccessRepository userModuleAccessRepository,
            OrganizationUnitRepository organizationUnitRepository,
            UserRoleAssignmentRepository userRoleAssignmentRepository,
            SystemRoleRepository systemRoleRepository,
            PermissionService permissionService) {
        this.moduleRepository = moduleRepository;
        this.userModuleAccessRepository = userModuleAccessRepository;
        this.organizationUnitRepository = organizationUnitRepository;
        this.userRoleAssignmentRepository = userRoleAssignmentRepository;
        this.systemRoleRepository = systemRoleRepository;
        this.permissionService = permissionService;
    }

    public boolean isAdmin(String userId) {
        if (userId == null || userId.isBlank()) {
            return false;
        }
        List<UserRoleAssignment> assignments = userRoleAssignmentRepository.findByUserId(userId);
        boolean hasAdminRole = assignments.stream().anyMatch(a -> {
            if ("ROLE-ADMIN".equals(a.roleId)) {
                return true;
            }
            return systemRoleRepository.findById(a.roleId)
                    .map(r -> "SYSTEM_ADMIN".equalsIgnoreCase(r.code))
                    .orElse(false);
        });
        if (hasAdminRole) {
            return true;
        }
        return permissionService.has(userId, "ROLE_MANAGE", null);
    }

    public int levelWeight(String level) {
        if (level == null)
            return 0;
        return switch (level.toUpperCase(Locale.ROOT)) {
            case "MANAGER" -> 3;
            case "EDITOR" -> 2;
            case "VIEWER" -> 1;
            default -> 0;
        };
    }

    public boolean satisfies(String actualLevel, String requiredMinLevel) {
        return levelWeight(actualLevel) >= levelWeight(requiredMinLevel);
    }

    public List<String> getAccessibleModuleIds(String userId, String minAccessLevel) {
        if (isAdmin(userId)) {
            return moduleRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                    .map(m -> m.id)
                    .toList();
        }

        List<UserModuleAccessEntity> userAccesses = userModuleAccessRepository.findByUserId(userId);
        Set<String> activeModuleIds = moduleRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(m -> m.id)
                .collect(Collectors.toSet());

        return userAccesses.stream()
                .filter(a -> satisfies(a.accessLevel, minAccessLevel))
                .map(a -> a.moduleId)
                .filter(activeModuleIds::contains)
                .distinct()
                .toList();
    }

    public boolean hasModuleAccess(String userId, String moduleId, String minAccessLevel) {
        if (moduleId == null || moduleId.isBlank()) {
            return false;
        }
        if (isAdmin(userId)) {
            return true;
        }
        return userModuleAccessRepository.findByUserIdAndModuleId(userId, moduleId)
                .map(a -> satisfies(a.accessLevel, minAccessLevel))
                .orElse(false);
    }

    public void requireModuleAccess(String userId, String moduleId, String minAccessLevel) {
        if (!hasModuleAccess(userId, moduleId, minAccessLevel)) {
            throw ApiException.forbidden("Không có quyền " + minAccessLevel + " trên module " + moduleId);
        }
    }

    public List<UserModuleAccessResponse> getUserModuleAccesses(String userId) {
        Map<String, String> orgNameMap = organizationUnitRepository.findAll().stream()
                .collect(Collectors.toMap(o -> o.id, o -> o.name, (a, b) -> a));

        if (isAdmin(userId)) {
            List<ModuleEntity> allModules = moduleRepository.findByIsActiveTrueOrderBySortOrderAsc();
            return allModules.stream()
                    .map(m -> new UserModuleAccessResponse(
                            m.id,
                            m.name,
                            m.description,
                            m.departmentId,
                            m.departmentId != null ? orgNameMap.get(m.departmentId) : null,
                            "MANAGER"))
                    .toList();
        }

        List<UserModuleAccessEntity> userAccesses = userModuleAccessRepository.findByUserId(userId);
        Map<String, ModuleEntity> activeModules = moduleRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .collect(Collectors.toMap(m -> m.id, m -> m, (a, b) -> a, LinkedHashMap::new));

        List<UserModuleAccessResponse> result = new ArrayList<>();
        for (UserModuleAccessEntity access : userAccesses) {
            ModuleEntity module = activeModules.get(access.moduleId);
            if (module != null) {
                result.add(new UserModuleAccessResponse(
                        module.id,
                        module.name,
                        module.description,
                        module.departmentId,
                        module.departmentId != null ? orgNameMap.get(module.departmentId) : null,
                        access.accessLevel));
            }
        }
        return result;
    }
}
