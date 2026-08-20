/**
 * Store Types
 * Zustand store type definitions
 */

import type {
  WorkflowStatus,
  TriggerDefinition,
  ParticipantScope,
  ParticipantNotification,
  WorkflowVariable,
  NodeDefinition,
  ConnectionDefinition,
} from './workflow';
import type { ValidationIssue } from './validation';
import type { ConnectorDefinition, ConnectorInstance, ActionDefinition } from './connector';
import type { CredentialDefinition, CredentialTestResult } from './credential';
import type { TaskDefinition, MyTasksFilter, TaskClaimResult, TaskReassignResult } from './task';
import type { InstanceSummary, MonitorFilter, InstanceDetail } from './monitoring';

export interface DesignerStoreState {
  workflowId?: string;
  workflowData?: {
    name: string;
    description?: string;
    type?: string;
    module?: string;
    ownerId: string;
    status: WorkflowStatus;
    version: string;
    trigger?: TriggerDefinition;
    participantScope?: ParticipantScope;
    participantNotification?: ParticipantNotification;
    variables: WorkflowVariable[];
    nodes: NodeDefinition[];
    connections: ConnectionDefinition[];
  };
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  selectedElement?: {
    type: 'node' | 'edge';
    id: string;
  };
  isDirty: boolean;
  savedAt?: string;
  validationIssues: ValidationIssue[];
  activeLeftPanel: 'node' | 'edge' | 'none';
  panel: 'config' | 'properties' | 'none';
  trigger: TriggerDefinition;
  participantScope: ParticipantScope;
  participantNotification: ParticipantNotification;
  variables: WorkflowVariable[];
}

export interface DesignerStoreActions {
  loadWorkflow: (workflowId: string) => Promise<void>;
  setWorkflowData: (data: DesignerStoreState['workflowData']) => void;
  setNodes: (nodes: NodeDefinition[]) => void;
  setEdges: (edges: EdgeDefinition[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: ConnectionDefinition) => void;
  addNode: (node: NodeDefinition) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeDefinition['config']>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeDefinition>) => void;
  removeEdge: (edgeId: string) => void;
  setTrigger: (trigger: TriggerDefinition) => void;
  setParticipantScope: (scope: ParticipantScope) => void;
  setParticipantNotification: (notification: ParticipantNotification) => void;
  setVariables: (variables: WorkflowVariable[]) => void;
  setSelectedElement: (element: DesignerStoreState['selectedElement']) => void;
  setIsDirty: (isDirty: boolean) => void;
  setSavedAt: (at: string) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  setActiveLeftPanel: (panel: DesignerStoreState['activeLeftPanel']) => void;
  setPanel: (panel: DesignerStoreState['panel']) => void;
  reset: () => void;
}

export interface EdgeDefinition {
  id: string;
  sourceNodeId: string;
  sourcePort: string;
  targetNodeId: string;
  condition?: string;
  isDefault?: boolean;
  label?: string;
  priority?: number;
}

export type NodeChange = {
  added: NodeDefinition[];
  removed: string[]; // node IDs
  modified: { id: string; changes: Partial<NodeDefinition> }[];
};

export type EdgeChange = {
  added: EdgeDefinition[];
  removed: string[]; // edge IDs
  modified: { id: string; changes: Partial<EdgeDefinition> }[];
}

export interface ConnectorStoreState {
  connectors: ConnectorDefinition[];
  instances: ConnectorInstance[];
  loading: boolean;
  error?: string;
}

export interface ConnectorStoreActions {
  loadConnectors: () => Promise<void>;
  getConnector: (id: string) => ConnectorDefinition | undefined;
  getAction: (connectorId: string, actionKey: string) => ActionDefinition | undefined;
  createInstance: (connectorId: string, name: string, config: Record<string, unknown>) => ConnectorInstance;
  testInstance: (instanceId: string) => Promise<{ success: boolean; message: string }>;
  updateInstance: (instanceId: string, config: Record<string, unknown>) => void;
  deleteInstance: (instanceId: string) => void;
}

export interface CredentialStoreState {
  credentials: CredentialDefinition[];
  loading: boolean;
  error?: string;
}

export interface CredentialStoreActions {
  loadCredentials: () => Promise<void>;
  getCredential: (id: string) => CredentialDefinition | undefined;
  createCredential: (credential: Omit<CredentialDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string; // returns id
  updateCredential: (credential: CredentialDefinition) => void;
  deleteCredential: (id: string) => void;
  testCredential: (id: string) => Promise<CredentialTestResult>;
}

export interface MyTasksStoreState {
  tasks: TaskDefinition[];
  total: number;
  page: number;
  pageSize: number;
  filters: MyTasksFilter;
  loading: boolean;
  error?: string;
}

export interface MyTasksStoreActions {
  loadTasks: (filters?: MyTasksFilter) => Promise<void>;
  getTask: (taskId: string) => TaskDefinition | undefined;
  createTask: (definition: TaskDefinition) => void;
  updateTask: (taskId: string, definition: Partial<TaskDefinition>) => void;
  deleteTask: (taskId: string) => void;
  claimTask: (taskId: string) => Promise<TaskClaimResult>;
  reassignTask: (taskId: string, newAssigneeId: string) => Promise<TaskReassignResult>;
  completeTask: (taskId: string, data: Record<string, unknown>) => Promise<boolean>;
  rejectTask: (taskId: string, comment?: string) => Promise<boolean>;
}

export interface InstancesStoreState {
  instances: InstanceSummary[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error?: string;
}

export interface InstancesStoreActions {
  loadInstances: (workflowId?: string, filters?: MonitorFilter) => Promise<void>;
  getInstance: (instanceId: string) => InstanceDetail | undefined;
  createInstance: (workflowId: string, triggerPayload?: Record<string, unknown>) => Promise<string>;
  suspendInstance: (instanceId: string) => Promise<boolean>;
  resumeInstance: (instanceId: string) => Promise<boolean>;
  cancelInstance: (instanceId: string) => Promise<boolean>;
}