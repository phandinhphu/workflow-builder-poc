import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection, type NodeChange, type EdgeChange } from '@xyflow/react';
import type { WorkflowVariable, ParticipantScope, ParticipantNotification, TriggerDefinition, WorkflowStatus } from '../types/workflow';

export interface DesignerPanelState {
  workflowId: string | null;
  workflowData: {
    name: string;
    description: string;
    type: string;
    module: string;
    owner: string;
    version: string;
    status: WorkflowStatus;
    executionPattern?: 'ON_DEMAND' | 'BATCH_CAMPAIGN';
  };
  nodes: Node[];
  edges: Edge[];
  trigger?: TriggerDefinition;
  participantScope: ParticipantScope;
  participantNotification: ParticipantNotification;
  variables: WorkflowVariable[];
  selectedElement: Node | Edge | null;
  selectedElementType: 'node' | 'edge' | null;
  isDirty: boolean;
  savedAt: string | null;
  validationIssues: any[];
  allowedNodes: string[];
  activeLeftPanel: 'none' | 'triggers' | 'nodes';
  panel: 'none' | 'node-library' | 'trigger-library' | 'validation' | 'context-explorer';
}

export interface DesignerActions {
  loadWorkflow: (wf: {
    id: string;
    name: string;
    description: string;
    type: string;
    module: string;
    owner: string;
    version: string;
    status: WorkflowStatus;
    executionPattern?: 'ON_DEMAND' | 'BATCH_CAMPAIGN';
    trigger?: TriggerDefinition;
    participantScope?: ParticipantScope;
    participantNotification?: ParticipantNotification;
    variables: WorkflowVariable[];
    nodes?: Node[];
    edges?: Edge[];
  }) => void;
  setWorkflowData: (data: Partial<DesignerPanelState['workflowData']>) => void;
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, data: any) => void;
  updateEdgeData: (id: string, data: any) => void;
  removeEdge: (id: string) => void;
  setTrigger: (trigger: TriggerDefinition) => void;
  setParticipantScope: (scope: Partial<ParticipantScope>) => void;
  setParticipantNotification: (notif: Partial<ParticipantNotification>) => void;
  setVariables: (variables: WorkflowVariable[]) => void;
  setSelectedElement: (element: Node | Edge | null, type: 'node' | 'edge' | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setSavedAt: (time: string | null) => void;
  setValidationIssues: (issues: any[]) => void;
  setAllowedNodes: (nodes: string[]) => void;
  highlightInvalidNodes: (nodeIds: string[]) => void;
  clearInvalidNodes: () => void;
  setActiveLeftPanel: (panel: 'none' | 'triggers' | 'nodes') => void;
  setPanel: (panel: 'none' | 'node-library' | 'trigger-library' | 'validation' | 'context-explorer') => void;
  reset: () => void;
}

export type DesignerStore = DesignerPanelState & DesignerActions;

const initialState: DesignerPanelState = {
  workflowId: null,
  workflowData: {
    name: '',
    description: '',
    type: 'Approval',
    module: 'Operations',
    owner: '',
    version: '1.0',
    status: 'DRAFT',
    executionPattern: 'ON_DEMAND',
  },
  nodes: [],
  edges: [],
  trigger: undefined,
  participantScope: {
    enabled: false,
    source: 'ORGANIZATION_DIRECTORY',
    scopeKind: 'all_active',
    selectorType: 'fixed',
    selectorConfig: {},
    snapshotPolicy: 'AT_INSTANCE_START',
  },
  participantNotification: {
    enabled: false,
    channels: ['inapp', 'email'],
    titleTemplate: 'Đợt đánh giá {{workflow.period}} đã bắt đầu',
    bodyTemplate: 'Bạn là người tham gia đợt đánh giá {{workflow.period}}. Thời gian hoàn thành: {{workflow.dueDate}}',
  },
  variables: [],
  selectedElement: null,
  selectedElementType: null,
  isDirty: false,
  savedAt: null,
  validationIssues: [],
  allowedNodes: [],
  activeLeftPanel: 'none',
  panel: 'none',
};

export const useDesignerStore = create<DesignerStore>((set) => ({
  ...initialState,

  loadWorkflow: (wf) => set({
    workflowId: wf.id,
    workflowData: {
      name: wf.name,
      description: wf.description,
      type: wf.type,
      module: wf.module,
      owner: wf.owner,
      version: wf.version,
      status: wf.status,
      executionPattern: wf.executionPattern ?? 'ON_DEMAND',
    },
    trigger: wf.trigger,
    participantScope: wf.participantScope ?? { ...initialState.participantScope },
    participantNotification: wf.participantNotification ?? { ...initialState.participantNotification },
    variables: wf.variables,
    nodes: wf.nodes ?? [],
    edges: wf.edges ?? [],
    selectedElement: null,
    selectedElementType: null,
    isDirty: false,
    savedAt: null,
    validationIssues: [],
    activeLeftPanel: 'none',
    panel: 'none',
  }),

  setWorkflowData: (data) => set((state) => ({
    workflowData: { ...state.workflowData, ...data },
    isDirty: true,
  })),

  setNodes: (nodesOrUpdater) => set((state) => ({
    nodes: typeof nodesOrUpdater === 'function' ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    isDirty: true,
  })),

  setEdges: (edgesOrUpdater) => set((state) => ({
    edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    isDirty: true,
  })),

  onNodesChange: (changes) => set((state) => {
    const removedNodeIds = new Set(
      changes.filter(change => change.type === 'remove').map(change => change.id)
    );
    const selectedNodeWasRemoved = state.selectedElementType === 'node'
      && state.selectedElement != null
      && removedNodeIds.has(state.selectedElement.id);
    const workflowChanged = changes.some(change =>
      change.type === 'add'
      || change.type === 'remove'
      || change.type === 'replace'
      || change.type === 'position'
    );

    return {
      nodes: applyNodeChanges(changes, state.nodes),
      edges: removedNodeIds.size > 0
        ? state.edges.filter(edge => !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target))
        : state.edges,
      selectedElement: selectedNodeWasRemoved ? null : state.selectedElement,
      selectedElementType: selectedNodeWasRemoved ? null : state.selectedElementType,
      isDirty: workflowChanged ? true : state.isDirty,
    };
  }),

  onEdgesChange: (changes) => set((state) => {
    const workflowChanged = changes.some(change =>
      change.type === 'add' || change.type === 'remove' || change.type === 'replace'
    );
    return {
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: workflowChanged ? true : state.isDirty,
    };
  }),

  onConnect: (connection) => set((state) => {
    const { source, target, sourceHandle } = connection;
    const sourceNode = state.nodes.find(n => n.id === source);
    const targetNode = state.nodes.find(n => n.id === target);

    // Không cho edge đi vào Start hoặc đi ra từ End (§10.3)
    if (!sourceNode || !targetNode) return {};
    if (sourceNode.data.nodeType === 'end' || targetNode.data.nodeType === 'start') return {};

    const isConditionSource = sourceNode.data.nodeType === 'condition';
    const isApprovalSource = sourceNode.data.nodeType === 'approval' || sourceNode.data.nodeType === 'review';
    let label = '';
    if (isConditionSource) {
      label = sourceHandle === 'false' ? 'FALSE' : 'TRUE';
    } else if (isApprovalSource) {
      label = (sourceHandle === 'REJECTED' || sourceHandle === 'false') ? 'TỪ CHỐI' : 'DUYỆT';
    }
    const edge: Edge = {
      id: `e-${source}-${target}-${Date.now()}`,
      source,
      target,
      sourceHandle,
      animated: true,
      data: { condition: '', isDefault: false, label },
    };
    return { edges: [...state.edges, edge], isDirty: true };
  }),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
    isDirty: true,
  })),

  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id),
    edges: state.edges.filter(e => e.source !== id && e.target !== id),
    selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
    selectedElementType: state.selectedElement?.id === id ? null : state.selectedElementType,
    isDirty: true,
  })),

  updateNodeData: (id, data) => set((state) => {
    const nodes = state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n);
    const selectedElement = state.selectedElementType === 'node' && state.selectedElement?.id === id
      ? nodes.find(n => n.id === id) ?? state.selectedElement
      : state.selectedElement;
    return { nodes, selectedElement, isDirty: true };
  }),

  updateEdgeData: (id, data) => set((state) => {
    const edges = state.edges.map(e => e.id === id ? { ...e, data: { ...e.data, ...data } } : e);
    const selectedElement = state.selectedElementType === 'edge' && state.selectedElement?.id === id
      ? edges.find(e => e.id === id) ?? state.selectedElement
      : state.selectedElement;
    return { edges, selectedElement, isDirty: true };
  }),

  removeEdge: (id) => set((state) => ({
    edges: state.edges.filter(e => e.id !== id),
    selectedElement: state.selectedElement?.id === id ? null : state.selectedElement,
    isDirty: true,
  })),

  setTrigger: (trigger) => set((state) => ({
    trigger,
    workflowData: state.workflowData,
    isDirty: true,
  })),

  setParticipantScope: (scope) => set((state) => ({
    participantScope: { ...state.participantScope, ...scope },
    isDirty: true,
  })),

  setParticipantNotification: (notif) => set((state) => ({
    participantNotification: { ...state.participantNotification, ...notif },
    isDirty: true,
  })),

  setVariables: (variables) => set({ variables, isDirty: true }),

  setSelectedElement: (element, type) => set({ selectedElement: element, selectedElementType: type }),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setSavedAt: (time) => set({ savedAt: time }),

  setValidationIssues: (issues) => set({ validationIssues: issues }),

  setAllowedNodes: (nodes) => set({ allowedNodes: nodes }),

  highlightInvalidNodes: (nodeIds) => set((state) => {
    const errorSet = new Set(nodeIds);
    return {
      nodes: state.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          invalid: errorSet.has(node.id),
        },
      })),
    };
  }),

  clearInvalidNodes: () => set((state) => ({
    nodes: state.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        invalid: false,
      },
    })),
  })),

  setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),

  setPanel: (panel) => set({ panel }),

  reset: () => set({ ...initialState }),
}));

export const getDesignerSnapshot = (state: DesignerStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  trigger: state.trigger,
  participantScope: state.participantScope,
  participantNotification: state.participantNotification,
  variables: state.variables,
});
