package com.acme.workflow.runtime;

import com.acme.workflow.common.*;
import com.acme.workflow.workflow.domain.*;
import com.acme.workflow.workflow.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class WorkflowTriggerService {
    private final WorkflowDefinitionRepository workflows;
    private final WorkflowVersionRepository versions;
    private final RuntimeEngineService engine;
    private final Jsons jsons;

    public WorkflowTriggerService(WorkflowDefinitionRepository workflows,WorkflowVersionRepository versions,RuntimeEngineService engine,Jsons jsons){this.workflows=workflows;this.versions=versions;this.engine=engine;this.jsons=jsons;}

    public Map<String,Object> manual(String workflowId,ObjectNode request){ensureTrigger(workflowId,"manual");return engine.start(workflowId,request);}

    public Map<String,Object> form(String workflowId,ObjectNode payload){ensureTrigger(workflowId,"form");ObjectNode request=jsons.object();request.set("triggerData",payload);if(payload.path("variables").isObject())request.set("variables",payload.path("variables"));if(payload.path("participantUserIds").isArray())request.set("participantUserIds",payload.path("participantUserIds"));request.put("idempotencyKey",payload.path("idempotencyKey").asText("form:"+Ids.uuid()));return engine.start(workflowId,request);}

    public Map<String,Object> webhook(String workflowId,ObjectNode payload,String signature,String idempotencyKey){JsonNode definition=ensureTrigger(workflowId,"webhook");JsonNode config=definition.path("trigger").path("config");verify(config.path("secretReference").asText(),jsons.write(payload),signature);WorkflowDefinitionEntity workflow=workflows.findById(workflowId).orElseThrow();ObjectNode request=jsons.object();request.set("triggerData",payload);if(payload.path("variables").isObject())request.set("variables",payload.path("variables"));if(payload.path("participantUserIds").isArray())request.set("participantUserIds",payload.path("participantUserIds"));request.put("idempotencyKey",idempotencyKey==null||idempotencyKey.isBlank()?"webhook:"+Ids.sha256(jsons.write(payload)):"webhook:"+idempotencyKey);return engine.startSystem(workflowId,request,workflow.ownerId);}

    @Scheduled(fixedDelayString="${app.runtime.schedule-trigger-delay-ms:30000}")
    public void scheduled(){Instant instant=Instant.now();for(WorkflowDefinitionEntity workflow:workflows.findByStatus("PUBLISHED")){if(workflow.activeVersionId==null)continue;WorkflowVersionEntity version=versions.findById(workflow.activeVersionId).orElse(null);if(version==null)continue;JsonNode definition=jsons.read(version.definitionSnapshot);if(!"schedule".equalsIgnoreCase(definition.path("trigger").path("type").asText()))continue;JsonNode config=definition.path("trigger").path("config");try{ZoneId zone=ZoneId.of(config.path("timezone").asText("Asia/Bangkok"));ZonedDateTime now=instant.atZone(zone);ZonedDateTime fire=CronExpression.parse(config.path("cron").asText()).next(now.minusSeconds(31));if(fire==null||fire.isAfter(now))continue;String slot=fire.format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));ObjectNode request=jsons.object();request.put("idempotencyKey","schedule:"+slot);request.putObject("triggerData").put("scheduledAt",fire.toInstant().toString()).put("timezone",zone.getId());engine.startSystem(workflow.id,request,workflow.ownerId);}catch(RuntimeException ignored){/* publish validation prevents invalid schedules; one workflow must not block others */}}}

    private JsonNode ensureTrigger(String workflowId,String expected){WorkflowDefinitionEntity workflow=workflows.findById(workflowId).orElseThrow(()->ApiException.notFound("Không tìm thấy workflow"));if(!"PUBLISHED".equals(workflow.status)||workflow.activeVersionId==null)throw ApiException.badRequest("WORKFLOW_NOT_PUBLISHED","Workflow chưa publish");JsonNode definition=jsons.read(versions.findById(workflow.activeVersionId).orElseThrow().definitionSnapshot);String actual=definition.path("trigger").path("type").asText();if(!expected.equalsIgnoreCase(actual))throw ApiException.badRequest("TRIGGER_TYPE_MISMATCH","Workflow không dùng "+expected+" trigger");return definition;}
    private void verify(String reference,String payload,String signature){if(reference==null||!reference.startsWith("env:"))throw ApiException.badRequest("WEBHOOK_SECRET_INVALID","Webhook secretReference phải dùng env:VARIABLE");String secret=System.getenv(reference.substring(4));if(secret==null||secret.isBlank())throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"WEBHOOK_SECRET_UNAVAILABLE","Webhook secret chưa được cấu hình");if(signature==null)throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED,"WEBHOOK_SIGNATURE_REQUIRED","Thiếu chữ ký webhook");try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));String expected=HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));String supplied=signature.startsWith("sha256=")?signature.substring(7):signature;if(!MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII),supplied.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))throw new java.security.SignatureException();}catch(java.security.SignatureException error){throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED,"WEBHOOK_SIGNATURE_INVALID","Chữ ký webhook không hợp lệ");}catch(Exception error){throw new IllegalStateException(error);}}
}
