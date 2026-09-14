package com.acme.workflow.workflowtype;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.workflowtype.domain.WorkflowTypeEntity;
import com.acme.workflow.workflowtype.dto.ValidationRuleDto;
import com.acme.workflow.workflowtype.dto.WorkflowTypeResponse;
import com.acme.workflow.workflowtype.repository.WorkflowTypeAllowedNodeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeRepository;
import com.acme.workflow.workflowtype.repository.WorkflowTypeValidationRuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class WorkflowTypeService {
    private final WorkflowTypeRepository workflowTypeRepo;
    private final WorkflowTypeAllowedNodeRepository allowedNodeRepo;
    private final WorkflowTypeValidationRuleRepository validationRuleRepo;

    public WorkflowTypeService(WorkflowTypeRepository workflowTypeRepo,
                               WorkflowTypeAllowedNodeRepository allowedNodeRepo,
                               WorkflowTypeValidationRuleRepository validationRuleRepo) {
        this.workflowTypeRepo = workflowTypeRepo;
        this.allowedNodeRepo = allowedNodeRepo;
        this.validationRuleRepo = validationRuleRepo;
    }

    public List<WorkflowTypeResponse> getAllActive(boolean includeDetails) {
        List<WorkflowTypeEntity> entities = workflowTypeRepo.findAllByIsActiveTrueOrderBySortOrderAsc();
        if (!includeDetails) {
            return entities.stream().map(WorkflowTypeResponse::summary).toList();
        }

        return entities.stream().map(entity -> {
            List<String> allowedNodes = allowedNodeRepo.findByWorkflowTypeId(entity.id).stream()
                    .map(an -> an.nodeType)
                    .toList();
            List<ValidationRuleDto> rules = validationRuleRepo.findByWorkflowTypeId(entity.id).stream()
                    .map(ValidationRuleDto::from)
                    .toList();
            return WorkflowTypeResponse.detail(entity, allowedNodes, rules);
        }).toList();
    }

    public WorkflowTypeResponse getById(String id, boolean includeDetails) {
        WorkflowTypeEntity entity = workflowTypeRepo.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy loại workflow: " + id));

        if (!includeDetails) {
            return WorkflowTypeResponse.summary(entity);
        }

        List<String> allowedNodes = allowedNodeRepo.findByWorkflowTypeId(id).stream()
                .map(an -> an.nodeType)
                .toList();
        List<ValidationRuleDto> rules = validationRuleRepo.findByWorkflowTypeId(id).stream()
                .map(ValidationRuleDto::from)
                .toList();
        return WorkflowTypeResponse.detail(entity, allowedNodes, rules);
    }

    public List<String> getAllowedNodes(String typeId) {
        if (!workflowTypeRepo.existsById(typeId)) {
            throw ApiException.notFound("Không tìm thấy loại workflow: " + typeId);
        }
        return allowedNodeRepo.findByWorkflowTypeId(typeId).stream()
                .map(an -> an.nodeType)
                .toList();
    }

    public List<ValidationRuleDto> getValidationRules(String typeId) {
        if (!workflowTypeRepo.existsById(typeId)) {
            throw ApiException.notFound("Không tìm thấy loại workflow: " + typeId);
        }
        return validationRuleRepo.findByWorkflowTypeId(typeId).stream()
                .map(ValidationRuleDto::from)
                .toList();
    }
}
