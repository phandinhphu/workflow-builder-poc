package com.acme.workflow.workflow;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/workflows")
public class WorkflowController {
    private final WorkflowService service;

    public WorkflowController(WorkflowService service) {
        this.service = service;
    }

    @GetMapping
    List<Map<String, Object>> list(@RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return service.list(status, search);
    }

    @GetMapping("/{id}")
    ObjectNode get(@PathVariable String id) {
        return service.get(id);
    }

    @PostMapping
    ObjectNode create(@RequestBody ObjectNode body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    ObjectNode save(@PathVariable String id, @RequestBody ObjectNode body) {
        return service.save(id, body);
    }

    @PostMapping("/{id}/validate")
    Map<String, Object> validate(@PathVariable String id) {
        return service.validate(id);
    }

    @PostMapping("/{id}/publish")
    Map<String, Object> publish(@PathVariable String id) {
        return service.publish(id);
    }

    @GetMapping("/{id}/versions")
    List<Map<String, Object>> versions(@PathVariable String id) {
        return service.versions(id);
    }

    @GetMapping("/{id}/versions/{versionId}")
    ObjectNode version(@PathVariable String id, @PathVariable String versionId) {
        return service.version(id, versionId);
    }

    @GetMapping("/{id}/members")
    List<Map<String, Object>> members(@PathVariable String id) {
        return service.members(id);
    }

    @PutMapping("/{id}/members")
    List<Map<String, Object>> members(@PathVariable String id, @RequestBody List<Map<String, Object>> body) {
        return service.replaceMembers(id, body);
    }

    @PatchMapping("/{id}/status")
    ObjectNode status(@PathVariable String id, @RequestBody Map<String, String> body) {
        return service.changeStatus(id, body.getOrDefault("status", ""));
    }
}
