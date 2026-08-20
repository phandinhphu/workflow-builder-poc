export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'DELETED';

export type WorkflowType = 'Approval' | 'Review' | 'Assignment' | 'Notification' | 'System Action';

export interface WorkflowVariable {
  key: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'LIST';
  defaultValue?: ValueBinding;
  required?: boolean;
  description?: string;
}

export type ValueBinding =
  | { kind: 'CONSTANT'; value: unknown }
  | { kind: 'REFERENCE'; path: string }
  | { kind: 'EXPRESSION'; expression: string };

export type NodeType =
  | 'APPROVAL'
  | 'REVIEW'
  | 'ASSIGNMENT'
  | 'NOTIFICATION'
  | 'CONDITION'
  | 'FORM'
  | 'HTTP'
  | 'DATA'
  | 'CODE';

export interface NodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface ConnectionDefinition {
  id: string;
  sourceNodeId: string;
  sourcePort?: string;
  targetNodeId: string;
  condition?: string;
  isDefault?: boolean;
  label?: string;
}

export type AssigneeResolverType =
  | 'FIXED_USER'
  | 'ROLE'
  | 'GROUP'
  | 'CURRENT_PARTICIPANT'
  | 'PARTICIPANT_MANAGER'
  | 'CREATOR_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'DYNAMIC';

export interface AssigneeResolver {
  type: AssigneeResolverType;
  value?: string | ValueBinding;
  label?: string;
}

export type TriggerType = 'manual' | 'schedule' | 'form' | 'webhook';

export interface TriggerDefinition {
  type: TriggerType;
  config: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
}

export interface ParticipantScope {
  enabled: boolean;
  source: 'ORGANIZATION_DIRECTORY' | 'FROM_TRIGGER' | 'EXTERNAL';
  scopeKind: 'all_active' | 'department' | 'role' | 'fixed_users' | 'condition' | 'from_trigger';
  selectorType: 'fixed' | 'group' | 'role' | 'department' | 'condition' | 'expression' | 'external';
  selectorConfig: {
    department?: string;
    role?: string;
    userIds?: string[];
    rule?: string;
    triggerField?: string;
    [key: string]: unknown;
  };
  snapshotPolicy: 'AT_INSTANCE_START' | 'LIVE_REFRESH';
}

export interface ParticipantNotification {
  enabled: boolean;
  channels: ('inapp' | 'email' | 'teams')[];
  titleTemplate: string;
  bodyTemplate: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  type: string;
  module?: string;
  ownerId: string;
  status: WorkflowStatus;
  draftVersion: string;
  createdAt: string;
  updatedAt: string;
  trigger?: TriggerDefinition;
  participantScope?: ParticipantScope;
  participantNotification?: ParticipantNotification;
  variables: WorkflowVariable[];
  nodes: NodeDefinition[];
  connections: ConnectionDefinition[];
}

export type InstanceStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export type ParticipantStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface WorkflowParticipantEntry {
  id: string;
  userId: string;
  displayName: string;
  department?: string;
  currentStepLabel?: string;
  currentAssignee?: string;
  status: ParticipantStatus;
  startedAt?: string;
  completedAt?: string;
}

export interface WorkflowInstanceSummary {
  id: string;
  requestCode: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: string;
  creatorId?: string;
  creatorName?: string;
  status: InstanceStatus;
  currentStepLabels: string[];
  activeAssignees: string[];
  startedAt: string;
  slaStatus?: 'ON_TIME' | 'OVERDUE';
  period?: string;
  participantCount?: number;
  participants?: WorkflowParticipantEntry[];
}

export interface OrgUser {
  id: string;
  externalId: string;
  displayName: string;
  email: string;
  department: string;
  role: string;
  level: string;
  status: 'Active' | 'Inactive';
  managerId?: string;
}

export interface WorkflowVersion {
  id: string;
  versionNo: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
  author: string;
  createdAt: string;
  changes: string[];
}

export interface NodeExecutionState {
  nodeId: string;
  label: string;
  state: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface InstanceTimelineEntry {
  id: string;
  time: string;
  title: string;
  description: string;
  state: 'success' | 'running' | 'waiting' | 'default';
}

export interface InstanceTask {
  id: string;
  assignee: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  dueAt: string;
  participantId?: string;
}