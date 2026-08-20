package com.acme.workflow.runtime;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/triggers")
public class WorkflowTriggerController {
    private final WorkflowTriggerService triggers;
    private final RuntimeEngineService engine;
    public WorkflowTriggerController(WorkflowTriggerService triggers,RuntimeEngineService engine){this.triggers=triggers;this.engine=engine;}
    @PostMapping("/form/{workflowId}") Map<String,Object> form(@PathVariable String workflowId,@RequestBody ObjectNode payload){return triggers.form(workflowId,payload);}
    @PostMapping("/webhook/{workflowId}") Map<String,Object> webhook(@PathVariable String workflowId,@RequestBody ObjectNode payload,@RequestHeader(value="X-Workflow-Signature",required=false)String signature,@RequestHeader(value="Idempotency-Key",required=false)String idempotencyKey){return triggers.webhook(workflowId,payload,signature,idempotencyKey);}
    @PostMapping("/events/{eventName}/{correlationKey}") Map<String,Object> event(@PathVariable String eventName,@PathVariable String correlationKey,@RequestBody(required=false)ObjectNode payload){return engine.signal(eventName,correlationKey,payload==null?new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode():payload);}
}
