package com.acme.workflow.module;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.module.dto.ModuleResponse;
import com.acme.workflow.module.dto.UserModuleAccessResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ModuleController {

    private final ModuleService moduleService;
    private final ModuleAccessService moduleAccessService;
    private final CurrentUserService currentUserService;

    public ModuleController(
            ModuleService moduleService,
            ModuleAccessService moduleAccessService,
            CurrentUserService currentUserService
    ) {
        this.moduleService = moduleService;
        this.moduleAccessService = moduleAccessService;
        this.currentUserService = currentUserService;
    }

    @GetMapping({"/api/v1/modules", "/api/modules"})
    public List<ModuleResponse> list() {
        return moduleService.listActiveModules();
    }

    @GetMapping({"/api/v1/modules/my", "/api/modules/my", "/api/v1/users/me/modules", "/api/users/me/modules"})
    public List<UserModuleAccessResponse> myModules() {
        String actor = currentUserService.id();
        return moduleAccessService.getUserModuleAccesses(actor);
    }

    @GetMapping({"/api/v1/modules/{id}", "/api/modules/{id}"})
    public ModuleResponse get(@PathVariable String id) {
        return moduleService.getModuleById(id);
    }
}
