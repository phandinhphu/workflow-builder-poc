package com.acme.workflow.runtime.repository;
import com.acme.workflow.runtime.domain.NodeExecutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface NodeExecutionRepository extends JpaRepository<NodeExecutionEntity,String>{
    long countByParticipantExecutionIdAndNodeId(String peId,String nodeId);
    long countByParticipantExecutionIdAndNodeIdAndStateIn(String peId,String nodeId,Collection<String> states);
    List<NodeExecutionEntity> findByParticipantExecutionIdAndNodeIdOrderByStartedAtAsc(String peId,String nodeId);
    List<NodeExecutionEntity> findByParticipantExecutionIdAndStateOrderByStartedAtAsc(String peId,String state);
    List<NodeExecutionEntity> findByInstanceIdOrderByStartedAtAsc(String instanceId);
    List<NodeExecutionEntity> findByInstanceIdOrderByExecutionOrderAsc(String instanceId);
    long countByInstanceId(String instanceId);
}
