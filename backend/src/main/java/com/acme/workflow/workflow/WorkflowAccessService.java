package com.acme.workflow.workflow;
import com.acme.workflow.auth.PermissionService;import com.acme.workflow.common.ApiException;import com.acme.workflow.workflow.domain.*;import com.acme.workflow.workflow.repository.*;import org.springframework.stereotype.Service;import java.util.*;
@Service
public class WorkflowAccessService{
 private final WorkflowMemberRepository members;private final PermissionService permissions;
 public WorkflowAccessService(WorkflowMemberRepository members,PermissionService permissions){this.members=members;this.permissions=permissions;}
 public boolean canView(String userId,String workflowId){return permissions.has(userId,"WORKFLOW_VIEW",null)||members.findByWorkflowIdAndUserId(workflowId,userId).isPresent();}
 public void requireView(String userId,String workflowId){if(!canView(userId,workflowId))throw ApiException.forbidden("Không có quyền xem workflow");}
 public void requireEdit(String userId,String workflowId){if(permissions.has(userId,"WORKFLOW_EDIT",null))return;String role=members.findByWorkflowIdAndUserId(workflowId,userId).map(m->m.workflowRole).orElse("");if(!Set.of("OWNER","EDITOR").contains(role))throw ApiException.forbidden("Không có quyền sửa workflow");}
 public void requirePublish(String userId,String workflowId){if(permissions.has(userId,"WORKFLOW_PUBLISH",null))return;if(!"OWNER".equals(members.findByWorkflowIdAndUserId(workflowId,userId).map(m->m.workflowRole).orElse("")))throw ApiException.forbidden("Chỉ owner hoặc system publisher có thể publish");}
 public WorkflowMemberEntity owner(String workflowId,String userId){WorkflowMemberEntity member=new WorkflowMemberEntity();member.workflowId=workflowId;member.userId=userId;member.workflowRole="OWNER";return members.save(member);}
 public List<WorkflowMemberEntity> members(String workflowId){return members.findByWorkflowId(workflowId);}
 public void replace(String workflowId,List<Map<String,Object>> values){members.deleteByWorkflowId(workflowId);values.forEach(value->{String role=String.valueOf(value.get("role")).toUpperCase(Locale.ROOT);if(!Set.of("OWNER","EDITOR","VIEWER","APPROVER").contains(role))throw ApiException.badRequest("INVALID_WORKFLOW_ROLE","Workflow role không hợp lệ");WorkflowMemberEntity member=new WorkflowMemberEntity();member.workflowId=workflowId;member.userId=String.valueOf(value.get("userId"));member.workflowRole=role;members.save(member);});}
}
