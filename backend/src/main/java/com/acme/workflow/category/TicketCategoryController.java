package com.acme.workflow.category;

import com.acme.workflow.category.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ticket-categories")
public class TicketCategoryController {
    private final TicketCategoryService service;

    public TicketCategoryController(TicketCategoryService service) {
        this.service = service;
    }

    @PostMapping("/validate-mapping")
    public CompatibilityValidationResult validateMapping(@RequestBody ValidateMappingRequest request) {
        return service.validateMapping(request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TicketCategoryResponse create(@RequestBody CreateTicketCategoryRequest request) {
        return service.create(request);
    }

    @GetMapping
    public List<TicketCategorySummaryResponse> list(@RequestParam(required = false) String search,
                                                    @RequestParam(required = false) Boolean activeOnly) {
        return service.list(search, activeOnly);
    }

    @GetMapping("/{id}")
    public TicketCategoryResponse get(@PathVariable String id) {
        return service.get(id);
    }

    @PutMapping("/{id}")
    public TicketCategoryResponse update(@PathVariable String id, @RequestBody UpdateTicketCategoryRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        service.delete(id);
    }

    @PatchMapping("/{id}/active")
    public TicketCategoryResponse toggleActive(@PathVariable String id, @RequestBody Map<String, Boolean> body) {
        boolean active = body.getOrDefault("active", true);
        return service.toggleActive(id, active);
    }
}
