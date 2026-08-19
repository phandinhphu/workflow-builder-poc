import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection, type NodeChange, type EdgeChange } from '@xyflow/react';
import type { WorkflowVariable, ParticipantScope, TriggerDefinition, WorkflowStatus } from '../types/workflow';

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
  };
  nodes: Node[];
  edges: Edge[];
  trigger?: TriggerDefinition;
  participantScope: ParticipantScope;
  variables: WorkflowVariable[];
  selectedElement: Node | Edge | null;
  selectedElementType: 'node' | 'edge' | null;
  isDirty: boolean;
  savedAt: string | null;
  validationIssues: any[];
  activeLeftPanel: 'none' | 'triggers' | 'nodes';
  panel: 'none' | 'node-library' | 'trigger-library' | 'validation';
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
    trigger?: TriggerDefinition;
    participantScope?: ParticipantScope;
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
  setVariables: (variables: WorkflowVariable[]) => void;
  setSelectedElement: (element: Node | Edge | null, type: 'node' | 'edge' | null) => void;
  setIsDirty: (dirty: boolean) => void;
  setSavedAt: (time: string | null) => void;
  setValidationIssues: (issues: any[]) => void;
  setActiveLeftPanel: (panel: 'none' | 'triggers' | 'nodes') => void;
  setPanel: (panel: 'none' | 'node-library' | 'trigger-library' | 'validation') => void;
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
  },
  nodes: [],
  edges: [],
  trigger: undefined,
  participantScope: {
    enabled: false,
    selectorType: 'fixed',
    selectorConfig: {},
    snapshotPolicy: 'AT_INSTANCE_START',
  },
  variables: [],
  selectedElement: null,
  selectedElementType: null,
  isDirty: false,
  savedAt: null,
  validationIssues: [],
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
    },
    trigger: wf.trigger,
    participantScope: wf.participantScope ?? { ...initialState.participantScope },
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
  })),

  setEdges: (edgesOrUpdater) => set((state) => ({
    edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
  })),

  onNodesChange: (changes) => set((state) => ({
    nodes: applyNodeChanges(changes, state.nodes),
  })),

  onEdgesChange: (changes) => set((state) => ({
    edges: applyEdgeChanges(changes, state.edges),
  })),

  onConnect: (connection) => set((state) => {
    const { source, target, sourceHandle } = connection;
    const sourceNode = state.nodes.find(n => n.id === source);
    const targetNode = state.nodes.find(n => n.id === target);

    // Không cho edge đi vào Start hoặc đi ra từ End (§10.3)
    if (!sourceNode || !targetNode) return {};
    if (sourceNode.data.nodeType === 'end' || targetNode.data.nodeType === 'start') return {};

    const isConditionSource = sourceNode.data.nodeType === 'condition';
    const label = isConditionSource ? (sourceHandle === 'false' ? 'FALSE' : 'TRUE') : '';
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
    isDirty: true,
  })),

  updateNodeData: (id, data) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n),
    isDirty: true,
  })),

  updateEdgeData: (id, data) => set((state) => ({
    edges: state.edges.map(e => e.id === id ? { ...e, data: { ...e.data, ...data } } : e),
    isDirty: true,
  })),

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

  setVariables: (variables) => set({ variables, isDirty: true }),

  setSelectedElement: (element, type) => set({ selectedElement: element, selectedElementType: type }),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setSavedAt: (time) => set({ savedAt: time }),

  setValidationIssues: (issues) => set({ validationIssues: issues }),

  setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),

  setPanel: (panel) => set({ panel }),

  reset: () => set({ ...initialState }),
}));

export const getDesignerSnapshot = (state: DesignerStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  trigger: state.trigger,
  participantScope: state.participantScope,
  variables: state.variables,
});