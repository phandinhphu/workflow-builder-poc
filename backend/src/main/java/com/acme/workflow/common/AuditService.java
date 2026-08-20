package com.acme.workflow.common;

import com.acme.workflow.audit.domain.AuditLogEntity;
import com.acme.workflow.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuditService {
    private final AuditLogRepository repository;
    private final Jsons jsons;

    public AuditService(AuditLogRepository repository, Jsons jsons) {
        this.repository = repository;
        this.jsons = jsons;
    }

    public void append(String actorId, String action, String type, String resourceId, String orgScopeId,
                       Object before, Object after, Object metadata) {
        AuditLogEntity log=new AuditLogEntity();log.id=Ids.uuid();log.actorId=actorId;log.action=action;log.resourceType=type;
        log.resourceId=resourceId;log.organizationScopeId=orgScopeId;log.beforeData=before==null?null:jsons.write(before);
        log.afterData=after==null?null:jsons.write(after);log.metadata=metadata==null?"{}":jsons.write(metadata);log.createdAt=Instant.now();repository.save(log);
    }
}
