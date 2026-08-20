/**
 * Node Port Definitions
 * Section 5.2, 5.3 - Graph, Node, Port và Connection Semantics
 *
 * Explicit port definitions for each node type
 * Mỗi node type có output ports rõ ràng với semantic đã định nghĩa
 */

import type { NodeType } from '../types/workflow';
import type { PortDefinition, PortCompatibilityRule } from '../types/ports';
import { PORT_KEYS } from '../types/ports';

// Start Node ports
export const START_PORTS: PortDefinition[] = [
  {
    id: 'start-success',
    portKey: PORT_KEYS.SUCCESS,
    semantic: 'SUCCESS',
    label: 'Started',
  },
];

// End Node ports - none (terminal node)

// Approval Node ports
export const APPROVAL_PORTS: PortDefinition[] = [
  {
    id: 'approval-approved',
    portKey: PORT_KEYS.APPROVED,
    semantic: 'BUSINESS_OUTCOME',
    label: 'Approved',
  },
  {
    id: 'approval-rejected',
    portKey: PORT_KEYS.REJECTED,
    semantic: 'BUSINESS_OUTCOME',
    label: 'Rejected',
  },
  {
    id: 'approval-request-change',
    portKey: PORT_KEYS.REQUEST_CHANGE,
    semantic: 'BUSINESS_OUTCOME',
    label: 'Request Change',
  },
];

// Review Node ports
export const REVIEW_PORTS: PortDefinition[] = [
  {
    id: 'review-completed',
    portKey: PORT_KEYS.REVIEW_COMPLETED,
    semantic: 'BUSINESS_OUTCOME',
    label: 'Completed',
  },
  {
    id: 'returned',
    portKey: 'RETURNED',
    semantic: 'BUSINESS_OUTCOME',
    label: 'Returned for Rework',
  },
];

// Assignment Node ports
export const ASSIGNMENT_PORTS: PortDefinition[] = [
  {
    id: 'assignment-completed',
    portKey: PORT_KEYS.COMPLETED,
    semantic: 'SUCCESS',
    label: 'Completed',
  },
  {
    id: 'assignment-timeout',
    portKey: PORT_KEYS.TIMEOUT,
    semantic: 'TEMPORAL',
    label: 'Timeout',
  },
];

// Condition Node ports
export const CONDITION_PORTS: PortDefinition[] = [
  {
    id: 'condition-true',
    portKey: PORT_KEYS.TRUE,
    semantic: 'DECISION',
    label: 'True',
  },
  {
    id: 'condition-false',
    portKey: PORT_KEYS.FALSE,
    semantic: 'DECISION',
    label: 'False',
  },
  {
    id: 'condition-default',
    portKey: PORT_KEYS.DEFAULT,
    semantic: 'DECISION',
    label: 'Default',
  },
];

// System Action Node ports
export const SYSTEM_ACTION_PORTS: PortDefinition[] = [
  {
    id: 'system-success',
    portKey: PORT_KEYS.SUCCESS,
    semantic: 'SUCCESS',
    label: 'Success',
  },
  {
    id: 'system-error',
    portKey: PORT_KEYS.ERROR,
    semantic: 'TECHNICAL',
    label: 'Error',
  },
];

// Timer Node ports
export const TIMER_PORTS: PortDefinition[] = [
  {
    id: 'timer-fired',
    portKey: PORT_KEYS.TIMER_FIRED,
    semantic: 'TEMPORAL',
    label: 'Timer Fired',
  },
  {
    id: 'timer-error',
    portKey: PORT_KEYS.ERROR,
    semantic: 'TECHNICAL',
    label: 'Error',
  },
];

// Parallel Split Node ports
export const PARALLEL_SPLIT_PORTS: PortDefinition[] = [
  {
    id: 'fork-branch-1',
    portKey: PORT_KEYS.BRANCH_1,
    semantic: 'DECISION',
    label: 'Branch 1',
  },
  {
    id: 'fork-branch-2',
    portKey: PORT_KEYS.BRANCH_2,
    semantic: 'DECISION',
    label: 'Branch 2',
  },
  {
    id: 'fork-branch-3',
    portKey: PORT_KEYS.BRANCH_3,
    semantic: 'DECISION',
    label: 'Branch 3',
  },
  {
    id: 'fork-token',
    portKey: PORT_KEYS.JOINED,
    semantic: 'SUCCESS',
    label: 'Fork Token',
  },
];

// Join Node ports
export const JOIN_PORTS: PortDefinition[] = [
  {
    id: 'join-joined',
    portKey: PORT_KEYS.JOINED,
    semantic: 'SUCCESS',
    label: 'Joined',
  },
];

// Data Transform Node ports
export const DATA_TRANSFORM_PORTS: PortDefinition[] = [
  {
    id: 'data-completed',
    portKey: PORT_KEYS.COMPLETED,
    semantic: 'SUCCESS',
    label: 'Completed',
  },
];

// Timer/Wait Event Node ports
export const WAIT_EVENT_PORTS: PortDefinition[] = [
  {
    id: 'wait-received',
    portKey: PORT_KEYS.EVENT_RECEIVED,
    semantic: 'TEMPORAL',
    label: 'Event Received',
  },
  {
    id: 'wait-timeout',
    portKey: PORT_KEYS.TIMEOUT,
    semantic: 'TEMPORAL',
    label: 'Timeout',
  },
];

// Subworkflow Node ports
export const SUBWORKFLOW_PORTS: PortDefinition[] = [
  {
    id: 'subworkflow-completed',
    portKey: PORT_KEYS.COMPLETED,
    semantic: 'SUCCESS',
    label: 'Completed',
  },
];

// Export all node port definitions
export const NODE_PORTS: Record<string, PortDefinition[]> = {
  'start': START_PORTS,
  'end': [],
  'approval': APPROVAL_PORTS,
  'review': REVIEW_PORTS,
  'assignment': ASSIGNMENT_PORTS,
  'condition': CONDITION_PORTS,
  'system': SYSTEM_ACTION_PORTS,
  'timer': TIMER_PORTS,
  'parallel_split': PARALLEL_SPLIT_PORTS,
  'join': JOIN_PORTS,
  'data_transform': DATA_TRANSFORM_PORTS,
  'wait_event': WAIT_EVENT_PORTS,
  'subworkflow': SUBWORKFLOW_PORTS,
};

// Get ports for a node type
export function getNodePorts(nodeType: NodeType): PortDefinition[] {
  return NODE_PORTS[nodeType] || [];
}

// Get default connection rules
export const DEFAULT_CONNECTION_RULES: Record<string, PortCompatibilityRule> = {
  'start': {
    sourcePortKey: PORT_KEYS.SUCCESS,
    compatibleTargetNodes: ['approval', 'condition', 'timer', 'parallel_split'],
  },
  'approval': {
    sourcePortKey: PORT_KEYS.APPROVED,
    compatibleTargetNodes: ['condition', 'assignment', 'system', 'end'],
  },
  'approval-rejected': {
    sourcePortKey: PORT_KEYS.REJECTED,
    compatibleTargetNodes: ['end', 'condition'],
  },
  'approval-request-change': {
    sourcePortKey: PORT_KEYS.REQUEST_CHANGE,
    compatibleTargetNodes: ['condition', 'assignment', 'end'],
  },
  'condition-true': {
    sourcePortKey: PORT_KEYS.TRUE,
    compatibleTargetNodes: ['approval', 'assignment', 'system', 'end', 'parallel_split'],
  },
  'condition-false': {
    sourcePortKey: PORT_KEYS.FALSE,
    compatibleTargetNodes: ['approval', 'assignment', 'system', 'end', 'parallel_split'],
  },
  'condition-default': {
    sourcePortKey: PORT_KEYS.DEFAULT,
    compatibleTargetNodes: ['approval', 'assignment', 'system', 'end'],
  },
  'assignment': {
    sourcePortKey: PORT_KEYS.COMPLETED,
    compatibleTargetNodes: ['condition', 'system', 'end', 'parallel_split'],
  },
  'system': {
    sourcePortKey: PORT_KEYS.SUCCESS,
    compatibleTargetNodes: ['condition', 'end', 'parallel_split'],
  },
  'timer': {
    sourcePortKey: PORT_KEYS.TIMER_FIRED,
    compatibleTargetNodes: ['end', 'condition', 'assignment'],
  },
  'parallel_split': {
    sourcePortKey: PORT_KEYS.BRANCH_1,
    compatibleTargetNodes: ['join', 'condition', 'assignment', 'system'],
  },
  'join': {
    sourcePortKey: PORT_KEYS.JOINED,
    compatibleTargetNodes: ['condition', 'assignment', 'system', 'end'],
  },
  'data_transform': {
    sourcePortKey: PORT_KEYS.COMPLETED,
    compatibleTargetNodes: ['condition', 'assignment', 'system', 'end'],
  },
  'wait_event': {
    sourcePortKey: PORT_KEYS.EVENT_RECEIVED,
    compatibleTargetNodes: ['condition', 'assignment', 'system', 'end'],
  },
  'subworkflow': {
    sourcePortKey: PORT_KEYS.COMPLETED,
    compatibleTargetNodes: ['condition', 'assignment', 'system', 'end'],
  },
};

const PORT_INFO: Record<string, { color: string; description: string }> = {
  COMPLETED: { color: '#10B981', description: 'Task completed successfully' },
  SUCCESS: { color: '#10B981', description: 'Operation succeeded' },
  APPROVED: { color: '#10B981', description: 'Approved' },
  REJECTED: { color: '#EF4444', description: 'Rejected' },
  REQUEST_CHANGE: { color: '#F59E0B', description: 'Change requested' },
  REVIEW_COMPLETED: { color: '#10B981', description: 'Review completed' },
  TRUE: { color: '#10B981', description: 'Condition is true' },
  FALSE: { color: '#EF4444', description: 'Condition is false' },
  DEFAULT: { color: '#6B7280', description: 'Default branch' },
  TIMEOUT: { color: '#F59E0B', description: 'Timed out' },
  TIMER_FIRED: { color: '#F59E0B', description: 'Timer fired' },
  ERROR: { color: '#EF4444', description: 'Error occurred' },
  RETRY_EXHAUSTED: { color: '#EF4444', description: 'Retries exhausted' },
  EVENT_RECEIVED: { color: '#8B5CF6', description: 'Event received' },
  BRANCH_1: { color: '#F97316', description: 'Branch 1' },
  BRANCH_2: { color: '#F97316', description: 'Branch 2' },
  BRANCH_3: { color: '#F97316', description: 'Branch 3' },
  JOINED: { color: '#10B981', description: 'Branches joined' },
};

export function getPortInfo(portKey: string): { color: string; description: string } {
  return PORT_INFO[portKey] || { color: '#6B7280', description: portKey };
}

export function getPortColor(portKey: string): string {
  return getPortInfo(portKey).color;
}

export function getPortLabel(portKey: string): string {
  return getPortInfo(portKey).description;
}