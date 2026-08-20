package com.acme.workflow.runtime;

import com.acme.workflow.common.Jsons;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class EmployeeEvaluationWorkflowIT {
    @Autowired RuntimeEngineService engine;
    @Autowired RuntimeQueryService query;
    @Autowired Jsons jsons;

    @Test
    void executesEmployeeEvaluationIncludingReworkLoopAndPersistsResult() {
        ObjectNode start=jsons.object();
        start.putArray("participantUserIds").add("U002");
        start.putObject("variables").put("period","Q3-2026");
        Map<String,Object> created=engine.start("6",start);
        String instanceId=(String)created.get("id");

        complete(pending(instanceId,"n1"),Map.of(
                "selfAchievements","Hoàn thành mục tiêu quý",
                "selfChallenges","Không",
                "selfScore",8));
        Map<String,Object> managerTask=pending(instanceId,"n2");
        List<Map<String,Object>> managerFields=(List<Map<String,Object>>)managerTask.get("formFields");
        assertThat(field(managerFields,"f0").get("resolvedValue")).isEqualTo("Hoàn thành mục tiêu quý");
        assertThat(field(managerFields,"f0b").get("resolvedValue")).isEqualTo(8);
        assertThat(field(managerFields,"f0").get("bindingStatus")).isEqualTo("RESOLVED");
        complete(managerTask,Map.of(
                "managerCompetency","good",
                "managerComment","Kết quả tốt",
                "managerScore",8,
                "nextPeriodGoals","Nâng độ ổn định"));
        complete(pending(instanceId,"n3"),Map.of(
                "hrCompleteCheck",true,
                "hrNote","Cần quản lý bổ sung",
                "evaluationValid",false));

        Map<String,Object> rework=pending(instanceId,"n2");
        assertThat(rework).isNotNull();
        complete(rework,Map.of(
                "managerCompetency","excellent",
                "managerComment","Đã bổ sung minh chứng",
                "managerScore",9));
        complete(pending(instanceId,"n3"),Map.of(
                "hrCompleteCheck",true,
                "hrNote","Hợp lệ",
                "evaluationValid",true));

        Map<String,Object> detail=query.instance(instanceId);
        assertThat(detail.get("status")).isEqualTo("COMPLETED");
        assertThat(query.evaluations("Q3-2026","U002")).hasSize(1);
        List<Map<String,Object>> executions=(List<Map<String,Object>>)detail.get("nodeExecutions");
        assertThat(executions.stream().filter(e->"n2".equals(e.get("nodeId"))).count()).isEqualTo(2);
        Map<String,Object> rootContext=(Map<String,Object>)detail.get("context");
        Map<String,Object> participantContexts=(Map<String,Object>)rootContext.get("participants");
        Map<String,Object> runtimeContext=(Map<String,Object>)participantContexts.values().iterator().next();
        Map<String,Object> nodeContext=(Map<String,Object>)((Map<String,Object>)runtimeContext.get("nodes")).get("n1");
        assertThat(((Map<String,Object>)nodeContext.get("output")).get("selfScore")).isEqualTo(8);
        assertThat(nodeContext.get("selfScore")).isEqualTo(8);
        assertThat(((Map<String,Object>)runtimeContext.get("instance")).get("id")).isEqualTo(instanceId);
        assertThat(((Map<String,Object>)runtimeContext.get("participant")).get("name")).isNotNull();
    }

    private Map<String,Object> pending(String instanceId,String nodeId){
        return query.tasks(null,null,null).stream()
                .filter(t->instanceId.equals(t.get("workflowInstanceId"))&&nodeId.equals(t.get("nodeId"))&&"PENDING".equals(t.get("status")))
                .findFirst().orElseThrow(() -> new IllegalStateException(query.instance(instanceId).toString()));
    }

    private void complete(Map<String,Object> task,Map<String,Object> data){
        ObjectNode request=jsons.object();request.set("data",jsons.value(data));
        Map<String,Object> result=engine.act((String)task.get("id"),"COMPLETE",request);
        assertThat(result.get("success")).isEqualTo(true);
    }

    private Map<String,Object> field(List<Map<String,Object>> fields,String id){
        return fields.stream().filter(field->id.equals(field.get("id"))).findFirst().orElseThrow();
    }
}
