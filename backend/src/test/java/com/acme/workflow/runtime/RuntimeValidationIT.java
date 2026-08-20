package com.acme.workflow.runtime;

import com.acme.workflow.common.ApiException;
import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RuntimeValidationIT {
    @Autowired RuntimeEngineService engine;
    @Autowired RuntimeQueryService query;
    @Autowired Jsons jsons;

    @Test
    void rejectsMissingRequiredFormFieldsWithoutClosingTask(){
        String instanceId=startFor("U002","VALIDATION-2026");
        Map<String,Object>task=pending(instanceId,"n1");
        assertThatThrownBy(()->engine.act((String)task.get("id"),"COMPLETE",jsons.object().putObject("data")))
                .isInstanceOf(ApiException.class).hasMessageContaining("bắt buộc");
        assertThat(pending(instanceId,"n1").get("status")).isEqualTo("PENDING");
    }

    @Test
    void appliesConfiguredFallbackWhenParticipantHasNoManager(){
        String instanceId=startFor("U006","FALLBACK-2026");
        Map<String,Object>self=pending(instanceId,"n1");ObjectNode body=jsons.object();body.putObject("data").put("selfAchievements","CEO review").put("selfScore",9);engine.act((String)self.get("id"),"COMPLETE",body);
        Map<String,Object>manager=pending(instanceId,"n2");
        assertThat(((Map<?,?>)manager.get("assignee")).get("id")).isEqualTo("U001");
    }

    @Test
    void cancelsRunningInstanceAndItsOpenTasks(){
        String instanceId=startFor("U002","CANCEL-2026");
        assertThat(engine.cancel(instanceId).get("status")).isEqualTo("CANCELLED");
        assertThat(query.instance(instanceId).get("status")).isEqualTo("CANCELLED");
        assertThat(query.tasks(null,null,null).stream().filter(t->instanceId.equals(t.get("workflowInstanceId"))).map(t->t.get("status"))).containsOnly("CANCELLED");
    }

    private String startFor(String user,String period){ObjectNode start=jsons.object();start.putArray("participantUserIds").add(user);start.putObject("variables").put("period",period);return(String)engine.start("6",start).get("id");}
    private Map<String,Object>pending(String instanceId,String nodeId){return query.tasks(null,null,null).stream().filter(t->instanceId.equals(t.get("workflowInstanceId"))&&nodeId.equals(t.get("nodeId"))&&"PENDING".equals(t.get("status"))).findFirst().orElseThrow(() -> new IllegalStateException(query.instance(instanceId).toString()));}
}
