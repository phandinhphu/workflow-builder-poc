package com.acme.workflow.runtime;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class RuntimeController {
    private final RuntimeEngineService engine;private final RuntimeQueryService query;private final WorkflowTriggerService triggers;
    public RuntimeController(RuntimeEngineService engine,RuntimeQueryService query,WorkflowTriggerService triggers){this.engine=engine;this.query=query;this.triggers=triggers;}
    @PostMapping("/workflows/{workflowId}/instances") Map<String,Object> start(@PathVariable String workflowId,@RequestBody(required=false)ObjectNode body){return triggers.manual(workflowId,body==null?new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode():body);}
    @GetMapping("/instances") List<Map<String,Object>> instances(@RequestParam(required=false)String workflowId,@RequestParam(required=false)String status,@RequestParam(required=false)String search){return query.instances(workflowId,status,search);}
    @GetMapping("/instances/{id}") Map<String,Object> instance(@PathVariable String id){return query.instance(id);}
    @PostMapping("/instances/{id}/cancel") Map<String,Object> cancel(@PathVariable String id){return engine.cancel(id);}
    @GetMapping("/tasks") List<Map<String,Object>> tasks(@RequestParam(required=false)String status,@RequestParam(required=false)String workflowId,@RequestParam(required=false)String assigneeId){return query.tasks(status,workflowId,assigneeId);}
    @PostMapping("/tasks/{id}/claim") Map<String,Object> claim(@PathVariable String id){return engine.claim(id);}
    @PostMapping("/tasks/{id}/complete") Map<String,Object> complete(@PathVariable String id,@RequestBody(required=false)ObjectNode body){return engine.act(id,"COMPLETE",body==null?new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode():body);}
    @PostMapping("/tasks/{id}/reject") Map<String,Object> reject(@PathVariable String id,@RequestBody(required=false)ObjectNode body){return engine.act(id,"REJECT",body==null?new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode():body);}
    @PostMapping("/tasks/{id}/actions/{action}") Map<String,Object> action(@PathVariable String id,@PathVariable String action,@RequestBody(required=false)ObjectNode body){return engine.act(id,action,body==null?new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode():body);}
    @GetMapping("/evaluations") List<Map<String,Object>> evaluations(@RequestParam(required=false)String period,@RequestParam(required=false)String participantId){return query.evaluations(period,participantId);}
}
