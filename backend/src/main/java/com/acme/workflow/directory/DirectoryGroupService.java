package com.acme.workflow.directory;

import com.acme.workflow.auth.*;
import com.acme.workflow.common.*;
import com.acme.workflow.identity.domain.*;
import com.acme.workflow.identity.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class DirectoryGroupService {
    private final DirectoryGroupRepository groups;
    private final DirectoryGroupMemberRepository members;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final AuditService audit;

    public DirectoryGroupService(DirectoryGroupRepository groups, DirectoryGroupMemberRepository members,
            HrmUserRepository users, OrganizationUnitRepository organizations,
            CurrentUserService current, PermissionService permissions, AuditService audit) {
        this.groups = groups;
        this.members = members;
        this.users = users;
        this.organizations = organizations;
        this.current = current;
        this.permissions = permissions;
        this.audit = audit;
    }

    public List<Map<String, Object>> list() {
        return groups.findAllByOrderByNameAsc().stream().map(this::map).toList();
    }

    public Map<String, Object> get(String id) {
        return map(entity(id));
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> body) {
        String actor = current.id();
        String scope = nullable(body.get("organizationScopeId"));
        permissions.require(actor, "GROUP_MANAGE", scope);
        if (scope != null && !organizations.existsById(scope))
            throw ApiException.notFound("Không tìm thấy organization scope");
        DirectoryGroup group = new DirectoryGroup();
        group.id = value(body, "id", Ids.uuid());
        group.code = required(body, "code").toUpperCase(Locale.ROOT);
        if (groups.findByCode(group.code).isPresent())
            throw ApiException.badRequest("DUPLICATE_GROUP", "Mã group đã tồn tại");
        group.name = required(body, "name");
        group.description = nullable(body.get("description"));
        group.organizationScopeId = scope;
        group.status = "ACTIVE";
        group.createdAt = group.updatedAt = Instant.now();
        groups.saveAndFlush(group);
        replaceMembers(group.id, stringList(body.get("memberUserIds")));
        Map<String, Object> result = map(group);
        audit.append(actor, "CREATE", "DIRECTORY_GROUP", group.id, scope, null, result, null);
        return result;
    }

    @Transactional
    public Map<String, Object> update(String id, Map<String, Object> body) {
        DirectoryGroup group = entity(id);
        String actor = current.id();
        permissions.require(actor, "GROUP_MANAGE", group.organizationScopeId);
        Map<String, Object> before = map(group);
        group.name = value(body, "name", group.name);
        if (body.containsKey("description"))
            group.description = nullable(body.get("description"));
        if (body.containsKey("status"))
            group.status = value(body, "status", group.status).toUpperCase(Locale.ROOT);
        group.updatedAt = Instant.now();
        groups.saveAndFlush(group);
        if (body.containsKey("memberUserIds"))
            replaceMembers(id, stringList(body.get("memberUserIds")));
        Map<String, Object> result = map(group);
        audit.append(actor, "UPDATE", "DIRECTORY_GROUP", id, group.organizationScopeId, before, result, null);
        return result;
    }

    public List<String> activeMemberIds(String idOrCode) {
        DirectoryGroup group = groups.findById(idOrCode).or(() -> groups.findByCode(idOrCode))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy group " + idOrCode));
        if (!"ACTIVE".equals(group.status))
            return List.of();
        return members.findByGroupId(group.id).stream().map(m -> m.userId)
                .filter(userId -> users.findById(userId).map(user -> "ACTIVE".equals(user.status)).orElse(false))
                .toList();
    }

    private void replaceMembers(String groupId, List<String> userIds) {
        members.deleteByGroupId(groupId);
        members.flush();
        Instant now = Instant.now();
        userIds.stream().distinct().forEach(userId -> {
            if (!users.existsById(userId))
                throw ApiException.badRequest("INVALID_GROUP_MEMBER", "Người dùng không tồn tại: " + userId);
            DirectoryGroupMember member = new DirectoryGroupMember();
            member.groupId = groupId;
            member.userId = userId;
            member.createdAt = now;
            members.save(member);
        });
    }

    private Map<String, Object> map(DirectoryGroup group) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", group.id);
        result.put("code", group.code);
        result.put("name", group.name);
        result.put("description", group.description);
        result.put("organizationScopeId", group.organizationScopeId);
        result.put("organizationScopeName", group.organizationScopeId == null ? null
                : organizations.findById(group.organizationScopeId).map(o -> o.name).orElse(null));
        result.put("status", group.status);
        List<Map<String, Object>> mappedMembers = members.findByGroupId(group.id).stream().map(member -> {
            HrmUser user = users.findById(member.userId).orElse(null);
            return Map.<String, Object>of("id", member.userId, "displayName",
                    user == null ? member.userId : user.displayName,
                    "email", user == null ? "" : user.email);
        }).toList();
        result.put("members", mappedMembers);
        result.put("memberCount", mappedMembers.size());
        result.put("createdAt", group.createdAt);
        result.put("updatedAt", group.updatedAt);
        return result;
    }

    private DirectoryGroup entity(String id) {
        return groups.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy group " + id));
    }

    private String required(Map<String, Object> body, String key) {
        String v = nullable(body.get(key));
        if (v == null)
            throw ApiException.badRequest("REQUIRED_FIELD", "Thiếu trường " + key);
        return v;
    }

    private String value(Map<String, Object> body, String key, String fallback) {
        return body.get(key) == null ? fallback : String.valueOf(body.get(key));
    }

    private String nullable(Object value) {
        return value == null || String.valueOf(value).isBlank() ? null : String.valueOf(value);
    }

    private List<String> stringList(Object value) {
        return value instanceof Collection<?> items ? items.stream().map(String::valueOf).toList() : List.of();
    }
}
