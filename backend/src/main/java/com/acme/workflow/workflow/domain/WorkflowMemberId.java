package com.acme.workflow.workflow.domain;
import java.io.Serializable;import java.util.Objects;
public class WorkflowMemberId implements Serializable{public String workflowId;public String userId;public WorkflowMemberId(){}public WorkflowMemberId(String workflowId,String userId){this.workflowId=workflowId;this.userId=userId;}@Override public boolean equals(Object value){return value instanceof WorkflowMemberId other&&Objects.equals(workflowId,other.workflowId)&&Objects.equals(userId,other.userId);}@Override public int hashCode(){return Objects.hash(workflowId,userId);}}
