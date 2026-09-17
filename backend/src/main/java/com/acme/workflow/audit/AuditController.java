package com.acme.workflow.audit;

import com.acme.workflow.audit.domain.AuditLogEntity;
import com.acme.workflow.audit.repository.AuditLogRepository;
import com.acme.workflow.auth.*;
import com.acme.workflow.common.Jsons;
import com.acme.workflow.identity.repository.HrmUserRepository;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditController {
    private final AuditLogRepository logs;
    private final HrmUserRepository users;
    private final CurrentUserService current;
    private final PermissionService permissions;
    private final Jsons jsons;

    public AuditController(AuditLogRepository logs, HrmUserRepository users, CurrentUserService current,
            PermissionService permissions, Jsons jsons) {
        this.logs = logs;
        this.users = users;
        this.current = current;
        this.permissions = permissions;
        this.jsons = jsons;
    }

    @SuppressWarnings("removal")
    @GetMapping
    Map<String, Object> list(@RequestParam(required = false) String resourceType,
            @RequestParam(required = false) String resourceId, @RequestParam(required = false) String actorId,
            @RequestParam(required = false) Instant from, @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        permissions.require(current.id(), "AUDIT_VIEW", null);
        int bounded = Math.min(Math.max(size, 1), 200);
        Specification<AuditLogEntity> spec = Specification.where(null);
        if (resourceType != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("resourceType"), resourceType));
        if (resourceId != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("resourceId"), resourceId));
        if (actorId != null)
            spec = spec.and((root, q, cb) -> cb.equal(root.get("actorId"), actorId));
        if (from != null)
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        if (to != null)
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to));
        Page<AuditLogEntity> result = logs.findAll(spec,
                PageRequest.of(Math.max(page, 0), bounded, Sort.by(Sort.Direction.DESC, "createdAt")));
        return Map.of("items", result.getContent().stream().map(this::map).toList(), "page", result.getNumber(), "size",
                result.getSize(), "total", result.getTotalElements(), "pages", result.getTotalPages());
    }

    private Map<String, Object> map(AuditLogEntity log) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", log.id);
        result.put("actorId", log.actorId);
        result.put("actorName",
                log.actorId == null ? null : users.findById(log.actorId).map(u -> u.displayName).orElse(log.actorId));
        result.put("action", log.action);
        result.put("resourceType", log.resourceType);
        result.put("resourceId", log.resourceId);
        result.put("organizationScopeId", log.organizationScopeId);
        result.put("before", read(log.beforeData));
        result.put("after", read(log.afterData));
        result.put("metadata", read(log.metadata));
        result.put("createdAt", log.createdAt);
        return result;
    }

    private Object read(String value) {
        return value == null ? null : jsons.mapper().convertValue(jsons.read(value), Object.class);
    }
}
