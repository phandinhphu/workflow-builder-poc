package com.acme.workflow.category;

import com.acme.workflow.category.dto.CompatibilityValidationResult;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.workflow.domain.WorkflowVersionEntity;
import com.acme.workflow.workflow.repository.WorkflowVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CompatibilityValidationServiceTest {
    private FormVersionRepository formVersions;
    private WorkflowVersionRepository workflowVersions;
    private Jsons jsons;
    private CompatibilityValidationService validator;

    @BeforeEach
    void setUp() {
        formVersions = mock(FormVersionRepository.class);
        workflowVersions = mock(WorkflowVersionRepository.class);
        jsons = new Jsons(new ObjectMapper());
        validator = new CompatibilityValidationService(formVersions, workflowVersions, jsons);
    }

    private FormVersionEntity mockFormVersion(String id, String fieldsJson) {
        FormVersionEntity entity = new FormVersionEntity();
        entity.id = id;
        entity.formDefinitionId = "form-def-1";
        entity.versionNumber = 1;
        entity.schemaSnapshot = "{\"fields\":" + fieldsJson + "}";
        return entity;
    }

    private WorkflowVersionEntity mockWorkflowVersion(String id, String nodesJson) {
        WorkflowVersionEntity entity = new WorkflowVersionEntity();
        entity.id = id;
        entity.workflowId = "wf-def-1";
        entity.versionNo = "1.0";
        entity.definitionSnapshot = "{\"nodes\":" + nodesJson + "}";
        return entity;
    }

    @Test
    @DisplayName("Cặp Form - Workflow khớp hoàn toàn các trường và kiểu -> Hợp lệ (valid: true)")
    void validate_exactMatch_returnsValid() {
        String formFields = """
            [
              {"key": "trip_cost", "label": "Dự toán chi phí", "type": "number", "required": true},
              {"key": "destination", "label": "Địa điểm", "type": "string", "required": true}
            ]
            """;
        String workflowNodes = """
            [
              {
                "id": "node_condition_1",
                "name": "Kiểm tra ngân sách",
                "type": "CONDITION",
                "data": {
                  "rules": [
                    {"field": "trip_cost", "fieldType": "number", "operator": "GREATER_THAN", "value": 10000000},
                    {"field": "destination", "fieldType": "string", "operator": "EQUALS", "value": "Đà Nẵng"}
                  ]
                }
              }
            ]
            """;

        when(formVersions.findById("fv-1")).thenReturn(Optional.of(mockFormVersion("fv-1", formFields)));
        when(workflowVersions.findById("wv-1")).thenReturn(Optional.of(mockWorkflowVersion("wv-1", workflowNodes)));

        CompatibilityValidationResult result = validator.validate("fv-1", "wv-1", null);

        assertThat(result.valid).isTrue();
        assertThat(result.errors).isEmpty();
        assertThat(result.workflowFields).hasSize(2);
        assertThat(result.formFields).hasSize(2);
    }

    @Test
    @DisplayName("Workflow yêu cầu trường trip_cost nhưng Form không có -> Lỗi MISSING_FIELD")
    void validate_missingField_returnsError() {
        String formFields = """
            [
              {"key": "other_field", "label": "Khác", "type": "string"}
            ]
            """;
        String workflowNodes = """
            [
              {
                "id": "node_condition_1",
                "name": "Kiểm tra ngân sách",
                "type": "CONDITION",
                "data": {
                  "rules": [
                    {"field": "trip_cost", "fieldType": "number", "operator": "GREATER_THAN", "value": 10000000}
                  ]
                }
              }
            ]
            """;

        when(formVersions.findById("fv-1")).thenReturn(Optional.of(mockFormVersion("fv-1", formFields)));
        when(workflowVersions.findById("wv-1")).thenReturn(Optional.of(mockWorkflowVersion("wv-1", workflowNodes)));

        CompatibilityValidationResult result = validator.validate("fv-1", "wv-1", null);

        assertThat(result.valid).isFalse();
        assertThat(result.errors).hasSize(1);
        assertThat(result.errors.get(0).errorCode).isEqualTo("MISSING_FIELD");
        assertThat(result.errors.get(0).nodeId).isEqualTo("node_condition_1");
        assertThat(result.errors.get(0).requiredField).isEqualTo("trip_cost");
    }

    @Test
    @DisplayName("Sử dụng Field Mapping để ánh xạ trip_cost sang price -> Thành công")
    void validate_withFieldMapping_returnsValid() {
        String formFields = """
            [
              {"key": "price", "label": "Giá tiền", "type": "number"}
            ]
            """;
        String workflowNodes = """
            [
              {
                "id": "node_condition_1",
                "name": "Kiểm tra giá",
                "type": "CONDITION",
                "data": {
                  "rules": [
                    {"field": "trip_cost", "fieldType": "number", "operator": "GREATER_THAN", "value": 5000000}
                  ]
                }
              }
            ]
            """;

        when(formVersions.findById("fv-1")).thenReturn(Optional.of(mockFormVersion("fv-1", formFields)));
        when(workflowVersions.findById("wv-1")).thenReturn(Optional.of(mockWorkflowVersion("wv-1", workflowNodes)));

        // Field mapping: trip_cost -> price
        var mappingNode = jsons.read("{\"trip_cost\": \"price\"}");
        CompatibilityValidationResult result = validator.validate("fv-1", "wv-1", mappingNode);

        assertThat(result.valid).isTrue();
        assertThat(result.errors).isEmpty();
        assertThat(result.effectiveMapping).containsEntry("trip_cost", "price");
    }

    @Test
    @DisplayName("Workflow yêu cầu kiểu number nhưng trường trong Form là string -> Lỗi TYPE_MISMATCH")
    void validate_typeMismatch_returnsError() {
        String formFields = """
            [
              {"key": "trip_cost", "label": "Dự toán chi phí", "type": "string"}
            ]
            """;
        String workflowNodes = """
            [
              {
                "id": "node_check_budget",
                "name": "Kiểm tra ngân sách",
                "type": "CONDITION",
                "data": {
                  "rules": [
                    {"field": "trip_cost", "fieldType": "number", "operator": "GREATER_THAN", "value": 10000000}
                  ]
                }
              }
            ]
            """;

        when(formVersions.findById("fv-1")).thenReturn(Optional.of(mockFormVersion("fv-1", formFields)));
        when(workflowVersions.findById("wv-1")).thenReturn(Optional.of(mockWorkflowVersion("wv-1", workflowNodes)));

        CompatibilityValidationResult result = validator.validate("fv-1", "wv-1", null);

        assertThat(result.valid).isFalse();
        assertThat(result.errors).hasSize(1);
        assertThat(result.errors.get(0).errorCode).isEqualTo("TYPE_MISMATCH");
        assertThat(result.errors.get(0).expectedType).isEqualTo("number");
        assertThat(result.errors.get(0).actualType).isEqualTo("string");
    }

    @Test
    @DisplayName("Kiểm tra template reference ${formData.custom_var} -> Tạo warning nếu Form không có trường đó")
    void validate_unresolvedTemplateVar_producesWarning() {
        String formFields = """
            [
              {"key": "title", "label": "Tiêu đề", "type": "string"}
            ]
            """;
        String workflowNodes = """
            [
              {
                "id": "node_notify",
                "name": "Gửi thông báo",
                "type": "NOTIFICATION",
                "data": {
                  "template": "Thông báo: ${formData.unmapped_field}"
                }
              }
            ]
            """;

        when(formVersions.findById("fv-1")).thenReturn(Optional.of(mockFormVersion("fv-1", formFields)));
        when(workflowVersions.findById("wv-1")).thenReturn(Optional.of(mockWorkflowVersion("wv-1", workflowNodes)));

        CompatibilityValidationResult result = validator.validate("fv-1", "wv-1", null);

        assertThat(result.valid).isTrue(); // Warnings do not invalidate
        assertThat(result.warnings).hasSize(1);
        assertThat(result.warnings.get(0).warningCode).isEqualTo("UNRESOLVED_TEMPLATE_VARIABLE");
    }
}
