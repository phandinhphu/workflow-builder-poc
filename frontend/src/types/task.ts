/**
 * Task Management Types
 * Section 8.1, 8.4 - Workflow Task Definition & Execution
 */

import type { UserRef, ResolverDefinition } from './resolution';
import type { CompletionPolicyConfig } from './workflow';
import type { JSONSchema } from './schema';
import type { SlaConfig, DurationUnit } from './sla';

export type TaskStatus = 'PENDING' | 'CLAIMED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'EXPIRED' | 'EXPIRING';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface TaskDefinition {
  id: string;
  workflowInstanceId: string;
  nodeId: string;
  taskType: 'ASSIGNMENT' | 'APPROVAL' | 'REVIEW' | 'FORM_SUBMIT';
  title: string;
  description?: string;
  assignee?: UserRef | string[];
  assigneeResolver?: ResolverDefinition;
  executionScope: 'INSTANCE' | 'EACH_PARTICIPANT';
  completionPolicy: CompletionPolicyConfig;
  formRef?: string;
  formSchema?: JSONSchema;
  outputMapping?: Record<string, string>;
  dueAt?: string;
  status?: TaskStatus;
  claimantId?: string;
  claimedAt?: string;
  slaConfig?: SlaConfig;
  allowedActions: ('COMPLETE' | 'REJECT' | 'REQUEST_CHANGE' | 'COMMENT' | 'CLAIM')[];
  notificationChannels?: ('email' | 'inapp' | 'teams')[];
  reminderBefore?: number;
  reminderUnit?: DurationUnit;
  createdAt: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}

export interface TaskExecutionState {
  id: string;
  taskId: string;
  status: TaskStatus;
  assignee?: UserRef;
  claimedAt?: string;
  startedAt?: string;
  completedAt?: string;
  formSubmission?: TaskSubmission;
  actionsTaken: TaskAction[];
  retryCount: number;
}

export interface TaskSubmission {
  data: Record<string, unknown>;
  submittedBy: UserRef;
  submittedAt: string;
  comments?: string;
  isDraft: boolean;
}

export interface TaskAction {
  id: string;
  action: TaskActionType;
  performedBy?: UserRef;
  performedAt: string;
  comment?: string;
  formData?: Record<string, unknown>;
  isIdempotent: boolean;
}

export type TaskActionType = 
  | 'COMPLETE' 
  | 'REJECT' 
  | 'REQUEST_CHANGE' 
  | 'COMMENT' 
  | 'CLAIM'
  | 'REASSIGN';

export interface MyTasksFilter {
  status?: TaskStatus[] | TaskStatus;
  priority?: TaskPriority[] | TaskPriority;
  workflowId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  assignedOnly?: boolean;
  participantId?: string;
  searchQuery?: string;
  sortBy?: 'dueDate' | 'createdDate' | 'priority' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface MyTasksPageData {
  tasks: TaskDefinition[];
  total: number;
  page: number;
  pageSize: number;
  filters: MyTasksFilter;
}

export interface TaskNotification {
  id: string;
  taskId: string;
  type: 'ASSIGNED' | 'REMINDER' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
  recipients: UserRef[];
  messageTemplate: string;
  channels: ('email' | 'inapp' | 'teams')[];
  sentAt?: string;
  sentStatus: 'PENDING' | 'SENT' | 'FAILED';
  retryCount: number;
}

export interface TaskClaimResult {
  success: boolean;
  taskId: string;
  claimedBy: UserRef;
  message: string;
  previouslyClaimedBy?: UserRef;
}

export interface TaskReassignResult {
  success: boolean;
  taskId: string;
  newAssignee: UserRef;
  message: string;
}
