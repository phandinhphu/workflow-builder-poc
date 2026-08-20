/**
 * Runtime Execution Types
 * Section 8.2, 8.3, 8.5 - Workflow Runtime Execution Model
 */

import type { SlaEvaluationResult } from './sla';
import type { TriggerType } from './workflow';
import type { UserRef } from './resolution';

export type NodeExecutionState = 
  | 'PENDING' 
  | 'READY' 
  | 'RUNNING' 
  | 'WAITING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type NodeTransitionReason = 
  | 'TASK_COMPLETED' 
  | 'TASK_REJECTED' 
  | 'TASK_TIMEOUT' 
  | 'TIMER_FIRED' 
  | 'EVENT_RECEIVED' 
  | 'CONNECTION_ROUTE' 
  | 'ESCALATION_TRIGGERED'
  | 'MANUAL_ADVANCE'
  | 'SYSTEM_ACTION_COMPLETED'
  | 'SYSTEM_ACTION_FAILED'
  | 'CONDITION_EVALUATED';

export interface NodeExecution {
  id: string;
  nodeId: string;
  workflowInstanceId: string;
  nodeType: string;
  state: NodeExecutionState;
  status: 'IDLE' | 'ACTIVE' | 'COMPLETED' | 'ERROR';
  position: { x: number; y: number };
  inputSnapshot: Record<string, unknown>;
  output: Record<string, unknown>;
  assignee?: string;
  participantId?: string;
  dueAt?: string;
  startedAt?: string;
  completedAt?: string;
  timeoutAt?: string;
  error?: ExecutionError;
  transitions: NodeTransition[];
  metadata?: Record<string, unknown>;
}

export interface NodeTransition {
  id: string;
  fromState: NodeExecutionState;
  toState: NodeExecutionState;
  triggeredBy: 'TASK' | 'TIMER' | 'EVENT' | 'CONNECTION' | 'SYSTEM' | 'MANUAL';
  triggeredAt: string;
  reason?: NodeTransitionReason;
  metadata?: Record<string, unknown>;
  portKey?: string; // Which output port was used
}

export interface ExecutionError {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  occurredAt: string;
  nodeId: string;
  recoverable: boolean;
  recoveryAction?: 'RETRY' | 'ROUTE_ERROR' | 'IGNORE' | 'CANCEL';
  retryCount?: number;
  maxRetries?: number;
}

export type TokenType = 
  | 'FORK_TOKEN'
  | 'JOIN_TOKEN'
  | 'WORKFLOW_TOKEN'
  | 'PARTICIPANT_TOKEN'
  | 'SUBWORKFLOW_TOKEN';

export interface ForkToken {
  id: string;
  workflowInstanceId: string;
  forkNodeId: string;
  createdAt: string;
  branches: ForkBranch[];
}

export interface ForkBranch {
  branchId: string;
  joinNodeId: string;
  currentStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  arrivedAt?: string;
  result?: Record<string, unknown>;
  canceledAt?: string;
}

export interface JoinNodeState {
  id: string;
  workflowInstanceId: string;
  joinNodeId: string;
  expectedBranches: string[];
  arrivalCount: number;
  completedBranches: string[];
  cancelRemaining: boolean;
  mergePolicy?: 'FIRST' | 'LAST' | 'COMBINE' | 'AVERAGE';
  joinedAt?: string;
  joinedResult?: Record<string, unknown>;
  status: 'PENDING' | 'JOINED' | 'CANCELLED';
}

export interface InstanceTimelineEntry {
  id: string;
  workflowInstanceId: string;
  timestamp: string;
  title: string;
  description?: string;
  nodeId?: string;
  eventType: 'TRIGGER' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'TASK_REJECTED' | 'TIMER_FIRED' | 'EVENT_RECEIVED' | 'ESCALATION' | 'SYSTEM_ACTION' | 'CONDITION' | 'FORK' | 'JOIN' | 'SUSPEND' | 'RESUME';
  status: 'SUCCESS' | 'RUNNING' | 'WAITING' | 'FAILED' | 'CANCELLED';
  participantId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface InstanceContext {
  instanceId: string;
  workflowId: string;
  workflowVersion: string;
  trigger?: TriggerContext;
  variables: Record<string, unknown>;
  participant: ParticipantContext;
  nodes: Record<string, NodeExecutionContext>;
  sla: SlaEvaluationResult;
}

export interface TriggerContext {
  type: TriggerType;
  payload: Record<string, unknown>;
  source: string;
  timestamp: string;
  idempotencyKey?: string;
}

export interface ParticipantContext {
  participantId?: string;
  participantScopeKind: 'ALL_ACTIVE' | 'DEPARTMENT' | 'ROLE' | 'FIXED' | 'CONDITION' | 'FROM_TRIGGER' | 'EXTERNAL';
  resolvedUsers: UserRef[];
  isSnapshot: boolean;
}

export interface NodeExecutionContext {
  nodeId: string;
  inputValues: Record<string, unknown>;
  outputValues: Record<string, unknown>;
  boundVariables: Record<string, unknown>;
  resolvedAssignee?: string;
  resolvedParticipants: string[];
  executionScope: 'INSTANCE' | 'EACH_PARTICIPANT';
  startTime: string;
  endTime?: string;
  status: NodeExecutionState;
}