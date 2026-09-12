package com.acme.workflow.form;

import com.acme.workflow.form.dto.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/forms")
public class FormController {
    private final FormService service;

    public FormController(FormService service) {
        this.service = service;
    }

    @PostMapping
    public FormDetailResponse create(@RequestBody CreateFormRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<FormSummaryResponse> list(@RequestParam(required = false) String status,
                                          @RequestParam(required = false) String search) {
        return service.list(status, search);
    }

    @GetMapping("/{id}")
    public FormDetailResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @PutMapping("/{id}/draft")
    public FormDetailResponse updateDraft(@PathVariable String id, @RequestBody UpdateDraftRequest request) {
        return service.updateDraft(id, request);
    }

    @PostMapping("/{id}/publish")
    public FormVersionResponse publish(@PathVariable String id) {
        return service.publish(id);
    }

    @GetMapping("/{id}/versions")
    public List<FormVersionResponse> getVersions(@PathVariable String id) {
        return service.getVersions(id);
    }

    @GetMapping("/{id}/versions/{versionId}")
    public FormVersionResponse getVersion(@PathVariable String id, @PathVariable String versionId) {
        return service.getVersion(id, versionId);
    }

    @PatchMapping("/{id}/status")
    public FormDetailResponse changeStatus(@PathVariable String id, @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "DRAFT");
        return service.changeStatus(id, status);
    }
}
