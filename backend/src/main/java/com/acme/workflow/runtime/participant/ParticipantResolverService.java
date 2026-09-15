package com.acme.workflow.runtime.participant;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.directory.DirectoryService;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.identity.repository.SystemRoleRepository;
import com.acme.workflow.identity.repository.UserRoleAssignmentRepository;
import com.acme.workflow.runtime.RuntimeValueResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ParticipantResolverService {

    private final DirectoryService directory;
    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final SystemRoleRepository roles;
    private final UserRoleAssignmentRepository roleAssignments;
    private final RuntimeValueResolver resolver;

    public ParticipantResolverService(DirectoryService directory,
                                      HrmUserRepository users,
                                      OrganizationUnitRepository organizations,
                                      SystemRoleRepository roles,
                                      UserRoleAssignmentRepository roleAssignments,
                                      RuntimeValueResolver resolver) {
        this.directory = directory;
        this.users = users;
        this.organizations = organizations;
        this.roles = roles;
        this.roleAssignments = roleAssignments;
        this.resolver = resolver;
    }

    public List<Map<String, Object>> resolveParticipants(ObjectNode definition, ObjectNode request) {
        LinkedHashMap<String, Map<String, Object>> unique = new LinkedHashMap<>();

        // Explicit override: caller provided specific participantUserIds
        JsonNode explicit = request.path("participantUserIds");
        if (explicit.isArray() && !explicit.isEmpty()) {
            explicit.forEach(id -> addActive(unique, id.asText()));
            return new ArrayList<>(unique.values());
        }

        // ON_DEMAND: single-request workflow, only the triggering actor is the "participant".
        String pattern = definition.path("executionPattern").asText("ON_DEMAND").toUpperCase(Locale.ROOT);
        JsonNode scope = definition.path("participantScope");
        boolean scopeEnabled = scope.isObject() && scope.path("enabled").asBoolean(false);
        if ("ON_DEMAND".equals(pattern) || !scopeEnabled) {
            String actorId = request.path("actorId").asText(null);
            if (actorId == null || actorId.isBlank()) {
                actorId = request.path("creatorId").asText(null);
            }
            if (actorId != null && !actorId.isBlank()) {
                addActive(unique, actorId);
                return new ArrayList<>(unique.values());
            }
            return new ArrayList<>();
        }

        // BATCH_CAMPAIGN: resolve the full participant snapshot from the scope config
        JsonNode cfg = scope.path("selectorConfig");
        String kind = scope.path("scopeKind").asText("all_active");
        List<Map<String, Object>> result = new ArrayList<>();
        switch (kind) {
            case "fixed_users" -> cfg.path("userIds").forEach(id -> {
                try {
                    result.add(directory.user(id.asText()));
                } catch (ApiException ignored) {
                }
            });
            case "department" -> {
                String orgId = cfg.path("organizationUnitId").asText(cfg.path("departmentId").asText());
                result.addAll(directory.users(null, "ACTIVE", orgId, true));
            }
            case "role" -> {
                String key = cfg.path("systemRoleCode").asText(cfg.path("role").asText());
                roles.findByCode(key).or(() -> roles.findById(key))
                        .ifPresent(role -> roleAssignments.findByRoleIdIn(List.of(role.id)).forEach(a -> {
                            try {
                                result.add(directory.user(a.userId));
                            } catch (ApiException ignored) {
                            }
                        }));
            }
            case "from_trigger" -> {
                JsonNode value = resolver.path(request.path("triggerData"), cfg.path("triggerField").asText());
                if (value.isArray())
                    value.forEach(id -> {
                        try {
                            result.add(directory.user(id.asText()));
                        } catch (ApiException ignored) {
                        }
                    });
                else if (value.isTextual())
                    result.add(directory.user(value.asText()));
            }
            default -> result.addAll(directory.users(null, "ACTIVE", null, true));
        }
        result.stream().filter(user -> {
            Object st = user.get("status");
            return st == null || "Active".equalsIgnoreCase(String.valueOf(st));
        }).forEach(user -> unique.put((String) user.get("id"), user));
        return new ArrayList<>(unique.values());
    }

    public void addActive(Map<String, Map<String, Object>> target, String id) {
        if (id == null || id.isBlank())
            return;
        try {
            Map<String, Object> user = directory.user(id);
            Object st = user.get("status");
            if (st == null || "Active".equalsIgnoreCase(String.valueOf(st)))
                target.put(id, user);
        } catch (Exception e) {
            // Fallback: check HrmUser repository directly if directory threw notFound
            users.findById(id).ifPresent(u -> {
                if ("ACTIVE".equalsIgnoreCase(u.status)) {
                    Map<String, Object> fallbackUser = new LinkedHashMap<>();
                    fallbackUser.put("id", u.id);
                    fallbackUser.put("displayName", u.displayName);
                    fallbackUser.put("email", u.email);
                    fallbackUser.put("status", "Active");
                    fallbackUser.put("organizationUnitId", u.organizationUnitId);
                    fallbackUser.put("managerId", u.managerId);
                    target.put(id, fallbackUser);
                }
            });
            if (!target.containsKey(id)) {
                target.put(id, Map.of("id", id, "displayName", id, "status", "Active"));
            }
        }
    }

    public boolean inScope(String scopeId, String participantOrgId) {
        if (scopeId == null)
            return true;
        return organizations.findById(participantOrgId).flatMap(
                org -> organizations.findById(scopeId).map(scope -> org.hierarchyPath.startsWith(scope.hierarchyPath)))
                .orElse(false);
    }
}
