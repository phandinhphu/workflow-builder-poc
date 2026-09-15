package com.acme.workflow.module;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.identity.domain.OrganizationUnit;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.module.domain.ModuleEntity;
import com.acme.workflow.module.dto.ModuleResponse;
import com.acme.workflow.module.repository.ModuleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ModuleService {

    private final ModuleRepository moduleRepository;
    private final OrganizationUnitRepository organizationUnitRepository;

    public ModuleService(
            ModuleRepository moduleRepository,
            OrganizationUnitRepository organizationUnitRepository
    ) {
        this.moduleRepository = moduleRepository;
        this.organizationUnitRepository = organizationUnitRepository;
    }

    public List<ModuleResponse> listActiveModules() {
        Map<String, String> orgNameMap = organizationUnitRepository.findAll().stream()
                .collect(Collectors.toMap(o -> o.id, o -> o.name, (a, b) -> a));

        return moduleRepository.findByIsActiveTrueOrderBySortOrderAsc().stream()
                .map(m -> toResponse(m, orgNameMap))
                .toList();
    }

    public ModuleResponse getModuleById(String id) {
        ModuleEntity module = moduleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy module " + id));

        String deptName = null;
        if (module.departmentId != null) {
            deptName = organizationUnitRepository.findById(module.departmentId)
                    .map(o -> o.name)
                    .orElse(null);
        }

        return new ModuleResponse(
                module.id,
                module.name,
                module.description,
                module.departmentId,
                deptName,
                module.isActive,
                module.sortOrder,
                module.createdAt,
                module.updatedAt
        );
    }

    private ModuleResponse toResponse(ModuleEntity module, Map<String, String> orgNameMap) {
        return new ModuleResponse(
                module.id,
                module.name,
                module.description,
                module.departmentId,
                module.departmentId != null ? orgNameMap.get(module.departmentId) : null,
                module.isActive,
                module.sortOrder,
                module.createdAt,
                module.updatedAt
        );
    }
}
