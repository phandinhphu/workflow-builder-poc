/**
 * Monitoring & Audit Types
 * Section 9 - Monitoring, Audit & History
 */

import type { InstanceTimelineEntry } from './workflow';
import type { TriggerType } from './workflow';

export type InstanceStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'SUSPENDED';

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'DELETED';

export interface InstanceSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: string;
  requestCode: string;
  creatorId?: string;
  creatorName?: string;
  status: InstanceStatus;
  currentStepLabels: string[];
  activeAssignees: string[];
  startedAt: string;
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  participantCount?: number;
  completedParticipantCount?: number;
  slaDueAt?: string;
}

export interface InstanceDetail {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: InstanceStatus;
  trigger: TriggerSummary;
  participants: InstanceParticipant[];
  timeline: InstanceTimelineEntry[];
  currentNode?: string;
  activeNodes: string[];
  completedNodes: string[];
  failedNodes: string[];
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
}

export interface TriggerSummary {
  type: TriggerType;
  requestCode?: string;
  startedAt?: string;
}

export interface InstanceParticipant {
  id: string;
  userId?: string;
  displayName: string;
  role?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: string;
  completedAt?: string;
  taskCount: number;
  completedTaskCount: number;
  dueAt?: string;
  isOverdue: boolean;
}

export type AuditActionType = 
  | 'CREATE' 
  | 'EDIT' 
  | 'DELETE' 
  | 'PUBLISH' 
  | 'SUSPEND' 
  | 'RESUME' 
  | 'TRIGGER' 
  | 'TASK_ASSIGN' 
  | 'TASK_COMPLETE' 
  | 'TASK_REJECT' 
  | 'TASK_CLAIM' 
  | 'TASK_REASSIGN' 
  | 'CONFIGURE' 
  | 'VALIDATE' 
  | 'PUBLISH_VERSION';

export interface AuditLogEntry {
  id: string;
  workflowId?: string;
  workflowVersion?: string;
  instanceId?: string;
  action: AuditActionType;
  actorId: string;
  actorName: string;
  timestamp: string;
  targetType: 'WORKFLOW' | 'INSTANCE' | 'NODE' | 'TASK' | 'CONFIGURATION';
  targetId: string;
  targetName?: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface ChangeLogEntry {
  id: string;
  workflowVersion: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  changes: ChangeEntry[];
}

export interface ChangeEntry {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
}

export interface VersionComparison {
  versionA: string;
  versionB: string;
  changes: ChangeComparison[];
}

export interface ChangeComparison {
  field: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'MOVED';
  oldValue?: unknown;
  newValue?: unknown;
  details?: string;
}

export interface MonitorFilter {
  status?: InstanceStatus[];
  workflowId?: string;
  workflowName?: string;
  creatorId?: string;
  dateFrom?: string;
  dateTo?: string;
  participantId?: string;
  searchQuery?: string;
  slaStatus?: 'ON_TIME' | 'WARNING' | 'OVERDUE';
}

export interface MonitorPageData {
  instances: InstanceSummary[];
  total: number;
  page: number;
  pageSize: number;
  filters: MonitorFilter;
}

export interface SlaStatusBadge {
  status: 'ON_TIME' | 'WARNING' | 'OVERDUE';
  label: string;
  color: 'green' | 'yellow' | 'red';
  icon: string;
}

export interface InstanceCardSummary {
  id: string;
  requestCode: string;
  workflowName: string;
  currentStep: string;
  status: InstanceStatus;
  assignee: string | string[];
  dueAt?: string;
  slaStatus?: SlaStatusBadge;
  startedAt: string;
}