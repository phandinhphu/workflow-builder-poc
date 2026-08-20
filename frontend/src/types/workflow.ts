import type { SlaConfig } from './sla';

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'DELETED';

export type WorkflowType = 'Approval' | 'Review' | 'Assignment' | 'Notification' | 'System Action';

// JSON Schema type for validation
export type JSONSchema = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: unknown[];
  format?: string;
  description?: string;
  [key: string]: unknown;
};

// Enhanced Variable with schema and mutation policy
export interface WorkflowVariable {
  key: string;
  name?: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'ARRAY';
  schema?: JSONSchema;
  defaultValue?: ValueBinding;
  mutationPolicy: 'READ_ONLY' | 'MUTABLE';
  required?: boolean;
  description?: string;
}

export type ValueBinding =
  | { kind: 'CONSTANT'; value: unknown }
  | { kind: 'REFERENCE'; path: string }
  | { kind: 'EXPRESSION'; expression: string };

export type NodeType =
  | 'START'
  | 'END'
  | 'APPROVAL'
  | 'REVIEW'
  | 'ASSIGNMENT'
  | 'NOTIFICATION'
  | 'CONDITION'
  | 'FORM'
  | 'HTTP'
  | 'DATA'
  | 'SYSTEM'
  | 'DATA_TRANSFORM'
  | 'TIMER'
  | 'WAIT_EVENT'
  | 'PARALLEL_SPLIT'
  | 'JOIN'
  | 'SUBWORKFLOW'
  | 'CODE';

// Port Definition - explicit port model
export type PortSemantic = 'SUCCESS' | 'BUSINESS_OUTCOME' | 'DECISION' | 'TEMPORAL' | 'TECHNICAL';

export interface PortDefinition {
  id: string;
  portKey: string; // COMPLETED, APPROVED, REJECTED, TRUE, FALSE, TIMEOUT, ERROR, REQUEST_CHANGE
  semantic: PortSemantic;
  label: string;
  description?: string;
}

// Node Kind classification
export type NodeKind = 'CONTROL' | 'HUMAN_TASK' | 'AUTOMATION' | 'WAIT' | 'TERMINAL' | 'COMPOSITION' | 'DATA_PURE' | 'BOUNDARY';

// Execution Scope
export type ExecutionScope = 'INSTANCE' | 'EACH_PARTICIPANT';

// Node Type Descriptor - contract between Designer and Engine
export interface NodeTypeDescriptor {
  typeKey: NodeType;
  kind: NodeKind;
  displayName: string;
  icon: string;
  color: string;
  configSchema: JSONSchema;
  inputSchema?: JSONSchema;
  outputSchema?: JSONSchema;
  inputPorts: PortDefinition[];
  outputPorts: PortDefinition[];
  supportedScopes: ExecutionScope[];
  supportsSla: boolean;
  supportsForm: boolean;
  supportsAssignee: boolean;
  handlerKey: string;
}

// Completion Policy for human tasks
export type CompletionPolicy = 'ALL' | 'ANY' | 'THRESHOLD' | 'PER_PARTICIPANT';

export interface CompletionPolicyConfig {
  policy: CompletionPolicy;
  threshold?: number;
  thresholdUnit?: 'COUNT' | 'PERCENTAGE';
}

// Assignment Mode for human tasks
export type AssignmentMode = 'DIRECT_ONE' | 'DIRECT_ALL' | 'CLAIMABLE_POOL';

// Human Task Configuration
export interface HumanTaskConfig {
  assigneeResolver: AssigneeResolver;
  assignmentMode: AssignmentMode;
  completionPolicy: CompletionPolicyConfig;
  executionScope: ExecutionScope;
  title: string;
  description?: string;
  formRef?: string;
  slaConfig?: SlaConfig;
  notificationChannels?: ('email' | 'inapp' | 'teams')[];
}

export interface NodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  config: Record<string, unknown>;
  executionScope?: ExecutionScope;
  inputBindings?: Record<string, ValueBinding>;
  outputSchema?: JSONSchema;
  position: { x: number; y: number };
}

export interface ConditionExpression {
  type: 'EXPRESSION' | 'PATH_COMPARISON' | 'MULTI_CONDITION';
  expression?: string;
  path?: string;
  operator?: string;
  value?: unknown;
  conditions?: ConditionExpression[];
  logicalOperator?: 'AND' | 'OR';
}

export interface ConnectionDefinition {
  id: string;
  sourceNodeId: string;
  sourcePort: string; // Made required - explicit port reference
  targetNodeId: string;
  condition?: ConditionExpression;
  priority?: number; // For multi-connection evaluation order
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
  settings?: { maxIterations?: number; [key: string]: unknown };
  lockVersion?: number;
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
