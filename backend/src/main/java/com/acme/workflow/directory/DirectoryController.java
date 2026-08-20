package com.acme.workflow.directory;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class DirectoryController {
    private final DirectoryService service;
    private final DirectoryGroupService groups;
    public DirectoryController(DirectoryService service, DirectoryGroupService groups) { this.service = service; this.groups = groups; }

    @GetMapping("/users")
    List<Map<String, Object>> users(@RequestParam(required = false) String search,
                                    @RequestParam(required = false) String status,
                                    @RequestParam(required = false) String organizationUnitId,
                                    @RequestParam(defaultValue = "true") boolean includeSubtree) {
        return service.users(search, status, organizationUnitId, includeSubtree);
    }
    @GetMapping("/users/{id}") Map<String, Object> user(@PathVariable String id) { return service.user(id); }
    @PostMapping("/users") Map<String, Object> createUser(@RequestBody Map<String, Object> body) { return service.createUser(body); }
    @PutMapping("/users/{id}") Map<String, Object> updateUser(@PathVariable String id, @RequestBody Map<String, Object> body) { return service.updateUser(id, body); }

    @GetMapping("/organizations") List<Map<String, Object>> organizations() { return service.organizations(); }
    @GetMapping("/organizations/tree") List<Map<String, Object>> organizationTree() { return service.organizationTree(); }
    @PostMapping("/organizations") Map<String, Object> createOrganization(@RequestBody Map<String, Object> body) { return service.createOrganization(body); }

    @GetMapping("/system-roles") List<Map<String, Object>> roles() { return service.roles(); }
    @PostMapping("/system-roles") Map<String, Object> createRole(@RequestBody Map<String, Object> body) { return service.createRole(body); }
    @PutMapping("/users/{id}/system-roles")
    List<Map<String, Object>> assignRoles(@PathVariable String id, @RequestBody List<Map<String, Object>> body) { return service.assignRoles(id, body); }

    @GetMapping("/groups") List<Map<String, Object>> groups() { return groups.list(); }
    @GetMapping("/groups/{id}") Map<String, Object> group(@PathVariable String id) { return groups.get(id); }
    @PostMapping("/groups") Map<String, Object> createGroup(@RequestBody Map<String, Object> body) { return groups.create(body); }
    @PutMapping("/groups/{id}") Map<String, Object> updateGroup(@PathVariable String id, @RequestBody Map<String, Object> body) { return groups.update(id, body); }
}
