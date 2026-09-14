package com.acme.workflow.workflowtype;

import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import com.acme.workflow.workflowtype.dto.WorkflowTypeResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/workflow-types", "/api/workflow-types"})
public class WorkflowTypeController {
    private final WorkflowTypeService workflowTypeService;

    public WorkflowTypeController(WorkflowTypeService workflowTypeService) {
        this.workflowTypeService = workflowTypeService;
    }

    @GetMapping
    public List<WorkflowTypeResponse> list(
            @RequestParam(name = "includeDetails", required = false, defaultValue = "false") boolean includeDetails) {
        return workflowTypeService.getAllActive(includeDetails);
    }

    @GetMapping("/{id}")
    public WorkflowTypeResponse get(
            @PathVariable String id,
            @RequestParam(name = "includeDetails", required = false, defaultValue = "true") boolean includeDetails) {
        return workflowTypeService.getById(id, includeDetails);
    }

    @GetMapping("/{id}/allowed-nodes")
    public List<String> getAllowedNodes(@PathVariable String id) {
        return workflowTypeService.getAllowedNodes(id);
    }

    @GetMapping("/{id}/rules")
    public List<ValidationRuleDto> getValidationRules(@PathVariable String id) {
        return workflowTypeService.getValidationRules(id);
    }
}
