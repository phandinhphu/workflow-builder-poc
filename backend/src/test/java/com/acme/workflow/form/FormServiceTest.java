package com.acme.workflow.form;

import com.acme.workflow.auth.CurrentUserService;
import com.acme.workflow.auth.PermissionService;
import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.AuditService;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.form.domain.FormDefinitionEntity;
import com.acme.workflow.form.domain.FormVersionEntity;
import com.acme.workflow.form.dto.CreateFormRequest;
import com.acme.workflow.form.dto.FormDetailResponse;
import com.acme.workflow.form.dto.FormVersionResponse;
import com.acme.workflow.form.dto.UpdateDraftRequest;
import com.acme.workflow.form.repository.FormDefinitionRepository;
import com.acme.workflow.form.repository.FormVersionRepository;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FormServiceTest {
    private FormDefinitionRepository definitions;
    private FormVersionRepository versions;
    private HrmUserRepository users;
    private CurrentUserService current;
    private PermissionService permissions;
    private AuditService audit;
    private Jsons jsons;
    private FormService service;
    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        definitions = mock(FormDefinitionRepository.class);
        versions = mock(FormVersionRepository.class);
        users = mock(HrmUserRepository.class);
        current = mock(CurrentUserService.class);
        permissions = mock(PermissionService.class);
        audit = mock(AuditService.class);
        mapper = new ObjectMapper();
        jsons = new Jsons(mapper);

        service = new FormService(definitions, versions, users, jsons, current, permissions, audit);

        when(current.id()).thenReturn("U000");
        when(permissions.has(anyString(), anyString(), any())).thenReturn(true);
    }

    @Test
    void createForm_success() {
        CreateFormRequest req = new CreateFormRequest();
        req.name = "Đơn xin nghỉ phép";
        req.code = "FORM_LEAVE_REQ";
        req.description = "Dùng khi nghỉ ốm hoặc phép năm";

        when(definitions.existsByCode("FORM_LEAVE_REQ")).thenReturn(false);

        FormDetailResponse res = service.create(req);

        assertThat(res.name).isEqualTo("Đơn xin nghỉ phép");
        assertThat(res.code).isEqualTo("FORM_LEAVE_REQ");
        assertThat(res.status).isEqualTo("DRAFT");
        verify(definitions, times(1)).saveAndFlush(any(FormDefinitionEntity.class));
    }

    @Test
    void createForm_duplicateCode_throwsException() {
        CreateFormRequest req = new CreateFormRequest();
        req.name = "Đơn trùng";
        req.code = "FORM_EXISTING";

        when(definitions.existsByCode("FORM_EXISTING")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("đã tồn tại");
    }

    @Test
    void updateDraft_rejectsInvalidFieldKey() {
        FormDefinitionEntity entity = new FormDefinitionEntity();
        entity.id = "form-123";
        entity.name = "Form Test";
        entity.code = "FORM_TEST";
        entity.status = "DRAFT";
        entity.draftSchema = "{\"fields\":[]}";

        when(definitions.findById("form-123")).thenReturn(Optional.of(entity));

        UpdateDraftRequest req = new UpdateDraftRequest();
        ObjectNode schema = mapper.createObjectNode();
        ArrayNode fields = schema.putArray("fields");
        ObjectNode field = fields.addObject();
        field.put("key", "invalid key with spaces");
        field.put("label", "Nhãn");
        field.put("type", "string");
        req.draftSchema = schema;

        assertThatThrownBy(() -> service.updateDraft("form-123", req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Mã trường");
    }

    @Test
    void publish_rejectsEmptyFields() {
        FormDefinitionEntity entity = new FormDefinitionEntity();
        entity.id = "form-123";
        entity.name = "Form Test";
        entity.code = "FORM_TEST";
        entity.status = "DRAFT";
        entity.draftSchema = "{\"fields\":[]}";

        when(definitions.findById("form-123")).thenReturn(Optional.of(entity));

        assertThatThrownBy(() -> service.publish("form-123"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Không thể xuất bản biểu mẫu không có trường dữ liệu nào");
    }

    @Test
    void publish_incrementsVersionAndFreezesSnapshot() {
        FormDefinitionEntity entity = new FormDefinitionEntity();
        entity.id = "form-123";
        entity.name = "Form Chi Phí";
        entity.code = "FORM_EXPENSE";
        entity.status = "DRAFT";

        ObjectNode schema = mapper.createObjectNode();
        ArrayNode fields = schema.putArray("fields");
        ObjectNode f = fields.addObject();
        f.put("key", "amount");
        f.put("label", "Số tiền");
        f.put("type", "number");
        entity.draftSchema = jsons.write(schema);

        when(definitions.findById("form-123")).thenReturn(Optional.of(entity));
        when(versions.findTopByFormDefinitionIdOrderByVersionNumberDesc("form-123")).thenReturn(Optional.empty());

        FormVersionResponse res = service.publish("form-123");

        assertThat(res.versionNumber).isEqualTo(1);
        assertThat(res.checksum).isNotBlank();
        assertThat(res.schemaSnapshot.get("fields")).hasSize(1);
        assertThat(entity.status).isEqualTo("PUBLISHED");
        verify(versions, times(1)).saveAndFlush(any(FormVersionEntity.class));
    }
}
