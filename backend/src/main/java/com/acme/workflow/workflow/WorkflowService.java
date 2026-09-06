package com.acme.workflow.workflow;

import com.acme.workflow.auth.*;
import com.acme.workflow.common.*;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.runtime.repository.WorkflowInstanceRepository;
import com.acme.workflow.workflow.domain.*;
import com.acme.workflow.workflow.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class WorkflowService {
    private final WorkflowDefinitionRepository definitions;
    private final WorkflowVersionRepository versions;
    private final WorkflowInstanceRepository instances;
    private final HrmUserRepository users;
    private final Jsons jsons;
    private final WorkflowCompiler compiler;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final WorkflowAccessService access;
    private final AuditService audit;

    public WorkflowService(WorkflowDefinitionRepository definitions, WorkflowVersionRepository versions,
            WorkflowInstanceRepository instances,
            HrmUserRepository users, Jsons jsons, WorkflowCompiler compiler, CurrentUserService current,
            PermissionService permissions, WorkflowAccessService access, AuditService audit) {
        this.definitions = definitions;
        this.versions = versions;
        this.instances = instances;
        this.users = users;
        this.jsons = jsons;
        this.compiler = compiler;
        this.current = current;
        this.permissions = permissions;
        this.access = access;
        this.audit = audit;
    }

    public List<Map<String, Object>> list(String status, String search) {
        String actor = current.id(), query = search == null ? "" : search.toLowerCase(Locale.ROOT);
        return definitions.findByStatusNotOrderByUpdatedAtDesc("DELETED").stream()
                .filter(w -> access.canView(actor, w.id))
                .filter(w -> status == null || status.isBlank() || status.equals(w.status))
                .filter(w -> query.isBlank() || w.name.toLowerCase(Locale.ROOT).contains(query)).map(this::summary)
                .toList();
    }

    private Map<String, Object> summary(WorkflowDefinitionEntity workflow) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", workflow.id);
        result.put("name", workflow.name);
        result.put("description", workflow.description);
        result.put("type", workflow.workflowType);
        result.put("module", workflow.moduleName);
        result.put("ownerId", workflow.ownerId);
        result.put("ownerName", users.findById(workflow.ownerId).map(u -> u.displayName).orElse(workflow.ownerId));
        result.put("status", workflow.status);
        result.put("draftVersion", workflow.draftVersion);
        result.put("lockVersion", workflow.lockVersion);
        result.put("createdAt", workflow.createdAt);
        result.put("updatedAt", workflow.updatedAt);
        result.put("runningInstanceCount", instances.countByWorkflowIdAndStatus(workflow.id, "RUNNING"));
        return result;
    }

    public ObjectNode get(String id) {
        access.requireView(current.id(), id);
        return map(entity(id));
    }

    private ObjectNode map(WorkflowDefinitionEntity workflow) {
        ObjectNode definition = jsons.object(workflow.draftDefinition);
        definition.put("id", workflow.id);
        definition.put("name", workflow.name);
        if (workflow.description == null)
            definition.remove("description");
        else
            definition.put("description", workflow.description);
        definition.put("type", workflow.workflowType);
        if (workflow.moduleName == null)
            definition.remove("module");
        else
            definition.put("module", workflow.moduleName);
        definition.put("ownerId", workflow.ownerId);
        definition.put("status", workflow.status);
        definition.put("draftVersion", workflow.draftVersion);
        definition.put("lockVersion", workflow.lockVersion);
        if (workflow.createdAt != null)
            definition.put("createdAt", workflow.createdAt.toString());
        if (workflow.updatedAt != null)
            definition.put("updatedAt", workflow.updatedAt.toString());
        return definition;
    }

    private WorkflowDefinitionEntity entity(String id) {
        WorkflowDefinitionEntity workflow = definitions.findById(id)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy workflow " + id));
        if ("DELETED".equals(workflow.status))
            throw ApiException.notFound("Không tìm thấy workflow " + id);
        return workflow;
    }

    @Transactional
    public ObjectNode create(ObjectNode body) {
        String actor = current.id();
        permissions.require(actor, "WORKFLOW_EDIT", null);
        String id = body.path("id").asText();
        if (id.isBlank())
            id = Ids.uuid();
        if (definitions.existsById(id))
            throw ApiException.badRequest("DUPLICATE_WORKFLOW", "Workflow id đã tồn tại");
        body.put("id", id);
        body.put("ownerId", body.path("ownerId").asText(actor));
        body.put("status", "DRAFT");
        body.put("draftVersion", body.path("draftVersion").asText("1.0"));
        requireName(body);
        WorkflowDefinitionEntity workflow = new WorkflowDefinitionEntity();
        workflow.id = id;
        copy(workflow, body);
        workflow.status = "DRAFT";
        workflow.draftDefinition = jsons.write(body);
        definitions.saveAndFlush(workflow);
        access.owner(id, workflow.ownerId);
        ObjectNode after = map(workflow);
        audit.append(actor, "CREATE", "WORKFLOW", id, null, null, jsons.map(after), null);
        return after;
    }

    @Transactional
    public ObjectNode save(String id, ObjectNode body) {
        WorkflowDefinitionEntity workflow = entity(id);
        String actor = current.id();
        access.requireEdit(actor, id);
        ObjectNode before = map(workflow);
        long expected = body.has("lockVersion") ? body.path("lockVersion").asLong() : workflow.lockVersion;
        if (expected != workflow.lockVersion)
            throw new ApiException(HttpStatus.CONFLICT, "WORKFLOW_CONFLICT",
                    "Workflow đã được người khác cập nhật; hãy tải lại");
        body.put("id", id);
        body.put("ownerId", body.path("ownerId").asText(workflow.ownerId));
        body.put("status", workflow.status);
        body.put("draftVersion", body.path("draftVersion").asText(workflow.draftVersion));
        body.remove(List.of("createdAt", "updatedAt", "lockVersion"));
        requireName(body);
        copy(workflow, body);
        workflow.draftDefinition = jsons.write(body);
        definitions.saveAndFlush(workflow);
        ObjectNode after = map(workflow);
        audit.append(actor, "UPDATE", "WORKFLOW", id, null, jsons.map(before), jsons.map(after), null);
        return after;
    }

    private void copy(WorkflowDefinitionEntity workflow, JsonNode body) {
        workflow.name = body.path("name").asText();
        workflow.description = nullable(body, "description");
        workflow.workflowType = body.path("type").asText("Approval");
        workflow.moduleName = nullable(body, "module");
        workflow.ownerId = body.path("ownerId").asText();
        workflow.draftVersion = body.path("draftVersion").asText("1.0");
    }

    public Map<String, Object> validate(String id) {
        access.requireEdit(current.id(), id);
        return compiler.validate(map(entity(id)));
    }

    @Transactional
    public Map<String, Object> publish(String id) {
        WorkflowDefinitionEntity workflow = entity(id);
        String actor = current.id();
        access.requirePublish(actor, id);
        ObjectNode definition = map(workflow);
        Map<String, Object> report = compiler.validate(definition);
        if (!Boolean.TRUE.equals(report.get("valid")))
            throw ApiException.badRequest("WORKFLOW_INVALID", jsons.write(report));

        String versionNo = workflow.draftVersion;
        ObjectNode snapshotDefinition = publishableSnapshot(definition, versionNo);
        String snapshot = jsons.write(snapshotDefinition);
        Optional<WorkflowVersionEntity> same = versions.findByWorkflowIdAndVersionNo(id, versionNo);
        if (same.isPresent()) {
            String existingCanonical = jsons
                    .write(publishableSnapshot(jsons.object(same.get().definitionSnapshot), same.get().versionNo));
            if (Ids.sha256(snapshot).equals(Ids.sha256(existingCanonical))) {
                // Re-publish is idempotent, but it must also reactivate the immutable version.
                workflow.status = "PUBLISHED";
                workflow.draftVersion = same.get().versionNo;
                workflow.draftDefinition = snapshot;
                workflow.activeVersionId = same.get().id;
                workflow.deletedAt = null;
                definitions.saveAndFlush(workflow);
                audit.append(actor, "PUBLISH", "WORKFLOW", id, null, null,
                        Map.of("versionId", same.get().id, "versionNo", same.get().versionNo, "reused", true), report);
                return Map.of("workflow", map(workflow), "validationReport", report, "versionId", same.get().id,
                        "versionNo", same.get().versionNo);
            }
            versionNo = nextPatch(versionNo);
            snapshotDefinition = publishableSnapshot(definition, versionNo);
            snapshot = jsons.write(snapshotDefinition);
        }
        WorkflowVersionEntity version = new WorkflowVersionEntity();
        version.id = Ids.uuid();
        version.workflowId = id;
        version.versionNo = versionNo;
        version.status = "PUBLISHED";
        version.definitionSnapshot = snapshot;
        version.checksum = Ids.sha256(snapshot);
        version.validationReport = jsons.write(report);
        version.authorId = actor;
        version.publishedAt = Instant.now();
        versions.saveAndFlush(version);
        workflow.status = "PUBLISHED";
        workflow.draftVersion = versionNo;
        workflow.draftDefinition = snapshot;
        workflow.activeVersionId = version.id;
        workflow.deletedAt = null;
        definitions.saveAndFlush(workflow);
        audit.append(actor, "PUBLISH", "WORKFLOW", id, null, null,
                Map.of("versionId", version.id, "versionNo", versionNo), report);
        return Map.of("workflow", map(workflow), "versionId", version.id, "versionNo", versionNo, "validationReport",
                report);
    }

    public List<Map<String, Object>> versions(String id) {
        access.requireView(current.id(), id);
        entity(id);
        return versions.findByWorkflowIdOrderByCreatedAtDesc(id).stream().map(version -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", version.id);
            result.put("versionNo", version.versionNo);
            result.put("status", version.status);
            result.put("checksum", version.checksum);
            result.put("authorId", version.authorId);
            result.put("author", users.findById(version.authorId).map(u -> u.displayName).orElse(version.authorId));
            result.put("publishedAt", version.publishedAt);
            result.put("createdAt", version.createdAt);
            result.put("validationReport",
                    jsons.mapper().convertValue(jsons.read(version.validationReport), Object.class));
            return result;
        }).toList();
    }

    public ObjectNode version(String workflowId, String versionId) {
        access.requireView(current.id(), workflowId);
        WorkflowVersionEntity version = versions.findById(versionId).filter(v -> workflowId.equals(v.workflowId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy workflow version"));
        ObjectNode result = jsons.object(version.definitionSnapshot);
        result.put("versionId", version.id);
        result.put("checksum", version.checksum);
        return result;
    }

    @Transactional
    public ObjectNode changeStatus(String id, String status) {
        WorkflowDefinitionEntity workflow = entity(id);
        String target = status.toUpperCase(Locale.ROOT), actor = current.id();
        access.requireEdit(actor, id);
        if (!Set.of("PUBLISHED", "SUSPENDED", "DELETED").contains(target))
            throw ApiException.badRequest("INVALID_STATUS", "Trạng thái không hợp lệ");
        if ("DELETED".equals(target) && instances.countByWorkflowIdAndStatus(id, "RUNNING") > 0)
            throw ApiException.badRequest("RUNNING_INSTANCES", "Không thể xóa workflow đang có instance chạy");
        if ("PUBLISHED".equals(target) && workflow.activeVersionId == null)
            throw ApiException.badRequest("NO_PUBLISHED_VERSION", "Workflow chưa có version đã publish");
        workflow.status = target;
        workflow.deletedAt = "DELETED".equals(target) ? Instant.now() : null;
        definitions.saveAndFlush(workflow);
        audit.append(actor, target, "WORKFLOW", id, null, null, Map.of("status", target), null);
        return "DELETED".equals(target) ? null : map(workflow);
    }

    public List<Map<String, Object>> members(String id) {
        access.requireView(current.id(), id);
        return access.members(id).stream()
                .map(member -> Map.<String, Object>of("userId", member.userId, "displayName",
                        users.findById(member.userId).map(u -> u.displayName).orElse(member.userId), "role",
                        member.workflowRole))
                .toList();
    }

    @Transactional
    public List<Map<String, Object>> replaceMembers(String id, List<Map<String, Object>> members) {
        access.requirePublish(current.id(), id);
        if (members.stream().noneMatch(item -> "OWNER".equalsIgnoreCase(String.valueOf(item.get("role")))))
            throw ApiException.badRequest("OWNER_REQUIRED", "Workflow phải có ít nhất một owner");
        access.replace(id, members);
        audit.append(current.id(), "UPDATE_MEMBERS", "WORKFLOW", id, null, null, members, null);
        return members(id);
    }

    public String publishedSnapshot(String workflowId) {
        WorkflowDefinitionEntity workflow = entity(workflowId);
        if (!"PUBLISHED".equals(workflow.status) || workflow.activeVersionId == null)
            throw ApiException.badRequest("WORKFLOW_NOT_PUBLISHED", "Workflow chưa được publish hoặc đang bị suspend");
        return versions.findById(workflow.activeVersionId)
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy version được publish")).definitionSnapshot;
    }

    public WorkflowVersionEntity activeVersion(String workflowId) {
        WorkflowDefinitionEntity workflow = entity(workflowId);
        if (!"PUBLISHED".equals(workflow.status) || workflow.activeVersionId == null)
            throw ApiException.badRequest("WORKFLOW_NOT_PUBLISHED", "Workflow chưa được publish hoặc đang bị suspend");
        return versions.findById(workflow.activeVersionId).orElseThrow();
    }

    private ObjectNode publishableSnapshot(ObjectNode source, String versionNo) {
        ObjectNode snapshot = source.deepCopy();
        snapshot.remove(List.of("lockVersion", "createdAt", "updatedAt"));
        snapshot.put("status", "PUBLISHED");
        snapshot.put("draftVersion", versionNo);
        return snapshot;
    }

    private String nextPatch(String version) {
        String[] parts = version.split("\\.");
        try {
            return parts.length == 1 ? parts[0] + ".1" : parts[0] + "." + (Integer.parseInt(parts[1]) + 1);
        } catch (NumberFormatException error) {
            return version + ".1";
        }
    }

    private String nullable(JsonNode node, String field) {
        return node.hasNonNull(field) && !node.path(field).asText().isBlank() ? node.path(field).asText() : null;
    }

    private void requireName(JsonNode body) {
        if (body.path("name").asText().isBlank())
            throw ApiException.badRequest("WF_NAME_REQUIRED", "Workflow cần có tên");
    }
}
