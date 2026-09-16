package com.acme.workflow.runtime.participant;

import com.acme.workflow.directory.DirectoryGroupService;
import com.acme.workflow.identity.repository.HrmUserRepository;
import com.acme.workflow.identity.repository.OrganizationUnitRepository;
import com.acme.workflow.identity.repository.SystemRoleRepository;
import com.acme.workflow.identity.repository.UserRoleAssignmentRepository;
import com.acme.workflow.runtime.RuntimeValueResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
public class AssigneeResolverService {

    private final HrmUserRepository users;
    private final OrganizationUnitRepository organizations;
    private final SystemRoleRepository roles;
    private final UserRoleAssignmentRepository roleAssignments;
    private final DirectoryGroupService groups;
    private final RuntimeValueResolver resolver;
    private final ParticipantResolverService participantResolver;

    public AssigneeResolverService(HrmUserRepository users,
            OrganizationUnitRepository organizations,
            SystemRoleRepository roles,
            UserRoleAssignmentRepository roleAssignments,
            DirectoryGroupService groups,
            RuntimeValueResolver resolver,
            ParticipantResolverService participantResolver) {
        this.users = users;
        this.organizations = organizations;
        this.roles = roles;
        this.roleAssignments = roleAssignments;
        this.groups = groups;
        this.resolver = resolver;
        this.participantResolver = participantResolver;
    }

    public List<String> resolveAssignees(JsonNode config, ObjectNode context, String instanceId,
            String fallbackCreatorId) {
        if (config == null)
            return List.of();
        String type = config.path("type").asText("fixed").toLowerCase(Locale.ROOT);
        String value = assigneeValue(config.path("value"), context);
        LinkedHashSet<String> result = new LinkedHashSet<>();
        switch (type) {
            case "fixed", "fixed_user" -> result.add(value);
            case "initiator", "creator" -> {
                String initId = context.path("initiator").path("userId").asText(null);
                if (initId != null && !initId.isBlank()) {
                    result.add(initId);
                } else if (fallbackCreatorId != null && !fallbackCreatorId.isBlank()) {
                    result.add(fallbackCreatorId);
                }
            }
            case "manager_of", "creator_manager" -> {
                String initiatorId = context.path("initiator").path("userId").asText(null);
                if (initiatorId == null || initiatorId.isBlank()) {
                    initiatorId = fallbackCreatorId;
                }
                if (initiatorId != null && !initiatorId.isBlank()) {
                    String managerId = context.path("initiator").path("managerId").asText(null);
                    if (managerId == null || managerId.isBlank()) {
                        managerId = users.findById(initiatorId).map(u -> u.managerId).orElse(null);
                    }
                    if (managerId != null && !managerId.isBlank()) {
                        result.add(managerId);
                    }
                }
            }
            case "current_participant" -> {
                String pId = context.path("participant").path("id").asText(null);
                String creatorId = fallbackCreatorId;
                Set<String> upstreamPids = extractAllUpstreamParticipants(context);
                if (!upstreamPids.isEmpty() && (pId == null || pId.equals(creatorId))) {
                    result.addAll(upstreamPids);
                } else if (pId != null) {
                    result.add(pId);
                }
            }
            case "participant_manager" -> result.add(context.path("participant").path("managerId").asText(null));
            case "department_head" ->
                result.add(organizations.findById(context.path("participant").path("organizationUnitId").asText())
                        .map(o -> o.headUserId).orElse(null));
            case "group" -> result.addAll(groups.activeMemberIds(value));
            case "role" -> roles.findByCode(value).or(() -> roles.findById(value))
                    .ifPresent(role -> roleAssignments.findByRoleIdIn(List.of(role.id)).stream()
                            .filter(a -> participantResolver.inScope(a.organizationScopeId,
                                    context.path("participant").path("organizationUnitId").asText()))
                            .forEach(a -> result.add(a.userId)));
            case "dynamic", "each_participant" -> {
                JsonNode dynamic = resolver.path(context, value);
                extractDynamicAssignees(dynamic, result);
                if (result.isEmpty()) {
                    result.addAll(extractAllUpstreamParticipants(context));
                }
            }
            default -> result.add(value);
        }
        result.removeIf(Objects::isNull);
        result.removeIf(String::isBlank);
        result.removeIf(id -> users.findById(id).map(u -> !"ACTIVE".equals(u.status)).orElse(true));
        if (result.isEmpty() && config.path("fallback").isObject())
            return resolveAssignees(config.path("fallback"), context, instanceId, fallbackCreatorId);
        // Fallback for manager_of if user has no direct manager: fallback to an active
        // ADMIN to prevent stranded ticket
        if (result.isEmpty() && ("manager_of".equals(type) || "creator_manager".equals(type))) {
            log.warn("[resolveAssignees] Could not resolve active manager for instance {}. Falling back to admin.",
                    instanceId);
            roles.findByCode("ADMIN").or(() -> roles.findByCode("ROLE-ADMIN"))
                    .ifPresent(role -> roleAssignments.findByRoleIdIn(List.of(role.id)).stream()
                            .findFirst().ifPresent(a -> result.add(a.userId)));
            if (result.isEmpty()) {
                users.findAll().stream().filter(u -> "ACTIVE".equals(u.status)).findFirst()
                        .ifPresent(u -> result.add(u.id));
            }
        }
        return result.stream().sorted().toList();
    }

    @SuppressWarnings("deprecation")
    public Set<String> extractAllUpstreamParticipants(ObjectNode context) {
        LinkedHashSet<String> pids = new LinkedHashSet<>();
        JsonNode nodes = context.path("nodes");
        if (nodes.isObject()) {
            nodes.fields().forEachRemaining(entry -> {
                JsonNode nodeData = entry.getValue();
                // 1. Form node submissionList
                JsonNode subList = nodeData.path("submissionList");
                if (subList.isArray()) {
                    subList.forEach(item -> {
                        String uid = item.path("userId").asText(null);
                        if (uid != null && !uid.isBlank())
                            pids.add(uid);
                    });
                }
                // 2. Assignment node participantIds
                JsonNode pIdArray = nodeData.path("participantIds");
                if (pIdArray.isArray()) {
                    pIdArray.forEach(item -> {
                        String uid = item.isObject() ? item.path("id").asText(null) : item.asText(null);
                        if (uid != null && !uid.isBlank())
                            pids.add(uid);
                    });
                }
                // 3. Form submissions map
                JsonNode submissions = nodeData.path("submissions");
                if (submissions.isObject()) {
                    submissions.fieldNames().forEachRemaining(uid -> {
                        if (uid != null && !uid.isBlank())
                            pids.add(uid);
                    });
                }
            });
        }
        return pids;
    }

    public void extractDynamicAssignees(JsonNode node, Set<String> target) {
        if (node == null || node.isMissingNode() || node.isNull())
            return;
        if (node.isArray()) {
            node.forEach(item -> {
                if (item.isObject()) {
                    if (item.has("id"))
                        target.add(item.get("id").asText());
                    else if (item.has("userId"))
                        target.add(item.get("userId").asText());
                    else if (item.has("employeeCode")) {
                        users.findByEmployeeCode(item.get("employeeCode").asText()).ifPresent(u -> target.add(u.id));
                    }
                } else {
                    target.add(item.asText());
                }
            });
        } else if (node.isObject()) {
            if (node.has("participantIds")) {
                extractDynamicAssignees(node.get("participantIds"), target);
            } else if (node.has("participants")) {
                extractDynamicAssignees(node.get("participants"), target);
            } else if (node.has("id")) {
                target.add(node.get("id").asText());
            } else if (node.has("userId")) {
                target.add(node.get("userId").asText());
            }
        } else if (node.isTextual()) {
            target.add(node.asText());
        }
    }

    private String assigneeValue(JsonNode value, ObjectNode context) {
        if (value.isObject()) {
            String kind = value.path("kind").asText();
            if ("REFERENCE".equals(kind))
                return resolver.path(context, value.path("path").asText()).asText();
            if ("CONSTANT".equals(kind))
                return value.path("value").asText();
        }
        return value.asText();
    }
}
