package com.acme.workflow.runtime;

import com.acme.workflow.common.Jsons;
import com.acme.workflow.runtime.domain.RuntimeJobEntity;
import com.acme.workflow.runtime.repository.RuntimeJobRepository;
import com.acme.workflow.workflow.WorkflowService;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class AdvancedRuntimeIT {
    @Autowired WorkflowService workflows;
    @Autowired RuntimeEngineService engine;
    @Autowired RuntimeQueryService query;
    @Autowired RuntimeJobRepository jobs;
    @Autowired Jsons jsons;

    @Test
    void resumesDurableTimerAndCompletesAtExplicitEnd() {
        String workflowId="WF-TIMER-E2E"; publish(linear(workflowId,"TIMER",jsons.object().put("duration","PT0S"),"TIMEOUT"));
        String instanceId=(String)engine.start(workflowId,start("timer-e2e")).get("id");
        RuntimeJobEntity timer=jobs.findTop100ByStateAndDueAtLessThanEqualOrderByDueAtAsc("PENDING",Instant.now().plusSeconds(1)).stream().filter(job->instanceId.equals(job.instanceId)).findFirst().orElseThrow();
        engine.handleJob(timer.id);
        assertThat(query.instance(instanceId).get("status")).isEqualTo("COMPLETED");
    }

    @Test
    void consumesCorrelatedWaitEventIdempotently() {
        ObjectNode config=jsons.object().put("eventName","employee.updated").put("correlationKey","${variables.employeeId}").put("timeout","PT1H");
        String workflowId="WF-WAIT-E2E";publish(linear(workflowId,"WAIT_EVENT",config,"RECEIVED"));
        ObjectNode request=start("wait-e2e");request.putObject("variables").put("employeeId","U002");
        String instanceId=(String)engine.start(workflowId,request).get("id");
        Map<String,Object> result=engine.signal("employee.updated","U002",jsons.object().put("changed",true));
        assertThat(result.get("consumed")).isEqualTo(true);
        assertThat(query.instance(instanceId).get("status")).isEqualTo("COMPLETED");
    }

    private ObjectNode linear(String id,String nodeType,ObjectNode config,String port){ObjectNode workflow=jsons.object();workflow.put("id",id).put("name",id).put("type","CUSTOM").put("ownerId","U000").put("draftVersion","1.0");workflow.putObject("trigger").put("type","manual").putObject("config");workflow.putArray("variables").addObject().put("key","employeeId").put("dataType","STRING").put("mutationPolicy","MUTABLE");var nodes=workflow.putArray("nodes");node(nodes.addObject(),"start","START",jsons.object());node(nodes.addObject(),"work",nodeType,config);node(nodes.addObject(),"end","END",jsons.object());var edges=workflow.putArray("connections");edge(edges.addObject(),"c1","start","SUCCESS","work");edge(edges.addObject(),"c2","work",port,"end");workflow.putObject("settings").put("maxIterations",10);return workflow;}
    private void node(ObjectNode node,String id,String type,ObjectNode config){node.put("id",id).put("type",type).put("name",id);node.set("config",config);node.putObject("position").put("x",0).put("y",0);}
    private void edge(ObjectNode edge,String id,String source,String port,String target){edge.put("id",id).put("sourceNodeId",source).put("sourcePort",port).put("targetNodeId",target);}
    private ObjectNode start(String key){ObjectNode request=jsons.object();request.putArray("participantUserIds").add("U002");request.put("idempotencyKey",key);return request;}
    private void publish(ObjectNode definition){workflows.create(definition);assertThat(workflows.validate(definition.path("id").asText()).get("valid")).isEqualTo(true);workflows.publish(definition.path("id").asText());}
}
