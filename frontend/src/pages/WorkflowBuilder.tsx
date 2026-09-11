import { useCallback, useRef, useEffect, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, type Edge, type ReactFlowInstance, BackgroundVariant, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Link, useParams, useSearchParams, useLocation, useBlocker, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, Cog8ToothIcon, ClockIcon, CheckCircleIcon, PlayIcon, ShieldCheckIcon, BeakerIcon } from '@heroicons/react/24/outline';
import CustomNode from '../components/nodes/CustomNode';
import DataTransformNode from '../components/nodes/DataTransformNode';
import TimerNode from '../components/nodes/TimerNode';
import ParallelSplitNode from '../components/nodes/ParallelSplitNode';
import JoinNode from '../components/nodes/JoinNode';
import SubworkflowNode from '../components/nodes/SubworkflowNode';
import WaitForEventNode from '../components/nodes/WaitForEventNode';
import WorkflowSettingsModal from '../components/WorkflowSettingsModal';
import ValidationDrawer, { validateWorkflow, type ValidationResult } from '../components/ValidationDrawer';
import VersionHistoryModal from '../components/VersionHistoryModal';
import NodeLibraryPanel from '../components/NodeLibraryPanel';
import TriggerLibraryPanel from '../components/TriggerLibraryPanel';
import ContextExplorerPanel from '../components/ContextExplorerPanel';
import NodeConfigPanel from '../components/NodeConfigPanel';
import EdgeConfigPanel from '../components/EdgeConfigPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import TestRunnerDrawer from '../components/TestRunnerDrawer';
import Toast, { useToasts } from '../components/Toast';
import { useDesignerStore } from '../stores/designerStore';
import { getWorkflow, workflows, workflowTemplates, addVersionEntry } from '../data/mockData';
import type { NodeType, TriggerType, WorkflowDefinition } from '../types/workflow';
import { api, ApiError } from '../api/client';
import { normalizeNodeDurations } from '../utils/duration';

const nodeTypes = {
  custom: CustomNode,
  data_transform: DataTransformNode,
  timer: TimerNode,
  parallel_split: ParallelSplitNode,
  join: JoinNode,
  subworkflow: SubworkflowNode,
  wait_event: WaitForEventNode,
};

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function normalizeContextBindings<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/nodes\.([^.}\s]+)\.(?!output\.)([A-Za-z_][\w-]*)/g, 'nodes.$1.output.$2') as T;
  }
  if (Array.isArray(value)) return value.map(item => normalizeContextBindings(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, normalizeContextBindings(item)])) as T;
  }
  return value;
}

function backendValidationResult(report: Record<string, any>): ValidationResult {
  const issues = [...(report.errors ?? []), ...(report.warnings ?? [])].map((issue: Record<string, unknown>) => ({
    type: String(issue.severity).toUpperCase() === 'WARNING' ? 'warning' as const : 'error' as const,
    nodeId: typeof issue.nodeId === 'string' ? issue.nodeId : undefined,
    edgeId: typeof issue.connectionId === 'string' ? issue.connectionId : undefined,
    message: String(issue.message ?? issue.code ?? 'Workflow không hợp lệ'),
  }));
  return { isValid: report.valid === true, issues };
}

function triggerTypeLabel(type?: TriggerType): string {
  switch (type) {
    case 'schedule': return 'Theo lịch trình';
    case 'form': return 'Khi gửi biểu mẫu';
    case 'webhook': return 'Theo sự kiện Webhook';
    default: return 'Kích hoạt thủ công';
  }
}

function designerNodeType(t: string): string {
  switch (t) {
    case 'START': return 'start';
    case 'END': return 'end';
    case 'APPROVAL': return 'approval';
    case 'REVIEW': return 'review';
    case 'ASSIGNMENT': return 'assignment';
    case 'NOTIFICATION': return 'notification';
    case 'CONDITION': return 'condition';
    case 'FORM': return 'form';
    case 'HTTP': return 'http';
    case 'DATA': return 'data';
    case 'CODE': return 'code';
    case 'DATA_TRANSFORM': return 'data_transform';
    case 'TIMER': return 'timer';
    case 'PARALLEL_SPLIT': return 'parallel_split';
    case 'JOIN': return 'join';
    case 'SUBWORKFLOW': return 'subworkflow';
    case 'WAIT_EVENT': return 'wait_event';
    default: return 'assignment';
  }
}

function runtimeNodeType(t: unknown): NodeType {
  const value = String(t ?? '').toUpperCase();
  const mapping: Record<string, NodeType> = {
    START: 'START', END: 'END', APPROVAL: 'APPROVAL', REVIEW: 'REVIEW', ASSIGNMENT: 'ASSIGNMENT',
    NOTIFICATION: 'NOTIFICATION', CONDITION: 'CONDITION', FORM: 'FORM', HTTP: 'HTTP', DATA: 'DATA',
    SYSTEM: 'SYSTEM', CODE: 'CODE', DATA_TRANSFORM: 'DATA_TRANSFORM', TIMER: 'TIMER', WAIT_EVENT: 'WAIT_EVENT',
    PARALLEL_SPLIT: 'PARALLEL_SPLIT', JOIN: 'JOIN', SUBWORKFLOW: 'SUBWORKFLOW',
  };
  return mapping[value] ?? 'ASSIGNMENT';
}

function buildWorkflowNodes(wf?: ReturnType<typeof getWorkflow>): { nodes: Node[]; edges: Edge[] } {
  const triggerType = wf?.trigger?.type ?? 'manual';
  const startNode: Node = { id: 'start-1', type: 'custom', data: { label: 'Bắt đầu', nodeType: 'start', subLabel: triggerTypeLabel(triggerType), triggerType }, position: { x: 300, y: 50 }, deletable: false };
  const endNode: Node = { id: 'end-1', type: 'custom', data: { label: 'Kết thúc', nodeType: 'end' }, position: { x: 300, y: 50 }, deletable: false };

  const persisted = wf?.nodes ?? [];
  const persistedStart = persisted.find(node => node.type === 'START');
  const persistedEnd = persisted.find(node => node.type === 'END');
  const defs = persisted.filter(node => !['START', 'END'].includes(node.type));
  if (persistedStart) { startNode.id = persistedStart.id; startNode.position = persistedStart.position; startNode.data = { label: persistedStart.name, nodeType: 'start', subLabel: triggerTypeLabel(triggerType), triggerType, ...persistedStart.config }; }
  if (persistedEnd) { endNode.id = persistedEnd.id; endNode.position = persistedEnd.position; endNode.data = { label: persistedEnd.name, nodeType: 'end', ...persistedEnd.config }; }
  if (defs.length === 0) {
    endNode.position = { x: 300, y: 210 };
    return {
      nodes: [startNode, endNode],
      edges: [{ id: 'e-1', source: startNode.id, target: endNode.id, sourceHandle: 'SUCCESS', animated: true, data: { label: '' } }],
    };
  }

  const lastDef = defs[defs.length - 1];
  endNode.position = { x: lastDef.position.x, y: lastDef.position.y + 160 };
  const nodes: Node[] = [
    startNode,
    ...defs.map(nd => ({
      id: nd.id,
      type: 'custom' as const,
      position: nd.position,
      data: { label: nd.name, nodeType: designerNodeType(nd.type), ...nd.config },
    })),
    endNode,
  ];

  const edges: Edge[] = [];
  let autoId = 0;
  const pushEdge = (source: string, target: string, sourcePort?: string, label = '') => {
    edges.push({ id: `e-${++autoId}`, source, target, sourceHandle: sourcePort, animated: true, data: { condition: '', isDefault: false, label } });
  };

  const conns = wf?.connections ?? [];
  const targets = new Set(conns.map(c => c.targetNodeId));
  const sources = new Set(conns.map(c => c.sourceNodeId));
  if (!targets.has(defs[0].id)) pushEdge(startNode.id, defs[0].id, 'SUCCESS');
  if (!sources.has(lastDef.id)) pushEdge(lastDef.id, endNode.id);
  conns.forEach(c => {
    const srcType = defs.find(d => d.id === c.sourceNodeId)?.type;
    const isCondition = srcType === 'CONDITION';
    const isApprovalOrReview = srcType === 'APPROVAL' || srcType === 'REVIEW';
    let port: string | undefined = undefined;
    let label = c.label ?? '';
    if (isCondition) {
      port = c.sourcePort === 'false' ? 'false' : 'true';
      label = port === 'false' ? 'FALSE' : 'TRUE';
    } else if (isApprovalOrReview) {
      port = c.sourcePort?.toUpperCase() === 'REJECTED' ? 'REJECTED' : 'APPROVED';
      label = port === 'REJECTED' ? 'TỪ CHỐI' : 'DUYỆT';
    }
    pushEdge(c.sourceNodeId, c.targetNodeId, port, label);
  });

  return { nodes, edges };
}

export default function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const templateId = searchParams.get('template');
  const createState = (location.state ?? {}) as Record<string, string>;

  const store = useDesignerStore();
  const {
    workflowData, nodes, edges, selectedElement, selectedElementType,
    isDirty, savedAt, panel, trigger, variables, participantScope, participantNotification,
    onNodesChange, onEdgesChange, onConnect, setNodes,
    setSelectedElement, setIsDirty, setSavedAt, setPanel, setWorkflowData,
    updateNodeData, updateEdgeData, removeNode, removeEdge, reset, setTrigger,
  } = store;

  const toasts = useToasts();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isValidationOpen, setIsValidationOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [persistedId, setPersistedId] = useState<string | null>(id ?? null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const blocker = useBlocker(isDirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    const wf = id ? getWorkflow(id) : undefined;
    const { nodes: n, edges: e } = buildWorkflowNodes(wf);
    const owner = wf?.ownerId ?? createState.owner ?? 'U000';
    const name = wf?.name ?? createState.name ?? (templateId ? workflowTemplates.find(t => t.id === templateId)?.name ?? 'Workflow mới' : 'Workflow mới');
    const triggerDef = wf?.trigger ?? { type: (createState as any).triggerType ?? 'manual', config: {} };
    reset();
    setPersistedId(id ?? null);
    store.loadWorkflow({
      id: id ?? `wf-${Date.now()}`,
      name,
      description: wf?.description ?? createState.description ?? '',
      type: wf?.type ?? createState.type ?? 'Approval',
      module: wf?.module ?? createState.module ?? 'Operations',
      owner,
      version: wf?.draftVersion ?? '1.0',
      status: wf?.status ?? 'DRAFT',
      trigger: triggerDef,
      participantScope: wf?.participantScope ?? (createState as any).participantScope,
      participantNotification: wf?.participantNotification ?? (createState as any).participantNotification,
      variables: wf?.variables ?? [],
      nodes: n,
      edges: e,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, templateId, location.state]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedElement(node, 'node');
  }, [setSelectedElement]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedElement(edge, 'edge');
  }, [setSelectedElement]);

  const onPaneClick = useCallback(() => {
    setSelectedElement(null, null);
  }, [setSelectedElement]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const triggerType = event.dataTransfer.getData('application/triggerType');
      if (!type || !reactFlowInstance) return;

      const hasStart = nodes.some(n => n.data.nodeType === 'start');
      if (type === 'start' && hasStart) {
        toasts.pushToast('warning', 'Workflow đã có bước Bắt đầu. Chỉ được phép một trigger.');
        return;
      }

      if (type === 'start') {
        const tType = (triggerType || 'manual') as TriggerType;
        setTrigger({ type: tType, config: {} });
      }

      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'custom',
        position,
        deletable: type !== 'start' && type !== 'end',
        data: {
          label: label || 'Bước mới',
          nodeType: type,
          triggerType: triggerType || 'manual',
          assignee: type === 'start' ? undefined : { type: 'fixed', value: '', label: '' },
        },
      };
      setNodes(nds => [...nds, newNode]);
    },
    [reactFlowInstance, nodes, setNodes, setTrigger, toasts]
  );

  const serializeDefinition = (): WorkflowDefinition => {
    const persistedNodes = nodes;
    const persistedIds = new Set(persistedNodes.map(node => node.id));
    return {
      id: persistedId ?? store.workflowId ?? `wf-${Date.now()}`,
      name: workflowData.name,
      description: workflowData.description,
      type: workflowData.type,
      module: workflowData.module,
      ownerId: workflowData.owner,
      status: workflowData.status,
      draftVersion: workflowData.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trigger,
      participantScope,
      participantNotification,
      variables,
      nodes: persistedNodes.map(node => {
        const { label, nodeType, subLabel: _subLabel, triggerType: _triggerType, ...config } = node.data as Record<string, unknown>;
        const type = runtimeNodeType(nodeType);
        return { id: node.id, type, name: String(label ?? 'Bước xử lý'), config: normalizeContextBindings(normalizeNodeDurations(type, config)), position: node.position };
      }),
      connections: edges.filter(edge => persistedIds.has(edge.source) && persistedIds.has(edge.target)).map(edge => {
        const source = persistedNodes.find(node => node.id === edge.source);
        const sourceType = runtimeNodeType(source?.data.nodeType);
        const defaultPort = sourceType === 'APPROVAL' ? 'APPROVED' : sourceType === 'REVIEW' ? 'REVIEW_COMPLETED' : sourceType === 'FORM' ? 'SUBMITTED' : 'SUCCESS';
        return { id: edge.id, sourceNodeId: edge.source, sourcePort: edge.sourceHandle ?? (sourceType === 'CONDITION' ? String(edge.data?.label ?? 'true').toLowerCase() : defaultPort), targetNodeId: edge.target, label: String(edge.data?.label ?? ''), isDefault: Boolean(edge.data?.isDefault) };
      }),
      settings: { maxIterations: 10 },
    } as WorkflowDefinition;
  };

  const handleSave = async (showSuccess = true) => {
    setSaving(true);
    try {
      const definition = serializeDefinition();
      const saved = persistedId ? await api.workflows.update(persistedId, definition) : await api.workflows.create(definition);
      const cachedIndex = workflows.findIndex(workflow => workflow.id === saved.id);
      if (cachedIndex >= 0) workflows[cachedIndex] = saved;
      else workflows.push(saved);
      setPersistedId(saved.id);
      setIsDirty(false);
      setSavedAt(`Đã lưu lúc ${formatTime(new Date())}`);
      if (showSuccess) toasts.pushToast('success', `Đã lưu workflow "${workflowData.name}" (bản nháp ${saved.draftVersion}).`);
      if (!id) navigate(`/workflows/${saved.id}/designer`, { replace: true });
      return saved;
    } catch (cause) {
      if (showSuccess) toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không lưu được workflow');
      throw cause;
    } finally { setSaving(false); }
  };

  const handleValidate = () => {
    const result = validateWorkflow(nodes, edges, { trigger, variables });
    setValidationResult(result);
    setIsValidationOpen(true);
  };

  const handlePublishClick = () => {
    const result = validateWorkflow(nodes, edges, { trigger, variables });
    setValidationResult(result);
    setIsValidationOpen(true);
  };

  const confirmPublish = () => {
    setIsPublishConfirmOpen(true);
  };

  const doPublish = async () => {
    setIsPublishConfirmOpen(false);
    setPublishing(true);
    try {
      const saved = await handleSave(false);
      const serverValidation = await api.workflows.validate(saved.id);
      if (serverValidation.valid !== true) {
        setValidationResult(backendValidationResult(serverValidation));
        setIsValidationOpen(true);
        toasts.pushToast('error', 'Backend từ chối publish. Vui lòng sửa các lỗi được hiển thị.');
        return;
      }
      const result = await api.workflows.publish(saved.id);
      if (result.workflow) {
        const cachedIndex = workflows.findIndex(workflow => workflow.id === saved.id);
        if (cachedIndex >= 0) workflows[cachedIndex] = result.workflow;
      }
      setWorkflowData({ status: 'PUBLISHED', version: result.versionNo ?? workflowData.version });
      setIsDirty(false); setSavedAt(`Đã xuất bản lúc ${formatTime(new Date())}`);
      addVersionEntry(result.versionNo ?? workflowData.version, workflowData.owner, [`Publish phiên bản ${result.versionNo ?? workflowData.version} của "${workflowData.name}"`]);
      toasts.pushToast('success', `Workflow "${workflowData.name}" v${result.versionNo ?? workflowData.version} đã được publish thành công.`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'WORKFLOW_INVALID') {
        try {
          const report = JSON.parse(cause.message) as Record<string, any>;
          setValidationResult(backendValidationResult(report));
          setIsValidationOpen(true);
        } catch { /* thông báo lỗi gốc vẫn được hiển thị bên dưới */ }
      }
      toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không xuất bản được workflow');
    } finally {
      setPublishing(false);
    }
  };

  const onSelectIssue = (nodeId?: string) => {
    if (!nodeId) return;
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedElement(node, 'node');
    }
  };

  const closePanels = () => setPanel('none');

  const workflowStatus = workflowData.status;
  const statusBadge =
    workflowStatus === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
    workflowStatus === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700';

  return (
    <div className="flex h-full flex-col bg-page">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/workflows" className="text-gray-400 hover:text-navy mr-1 shrink-0" aria-label="Quay lại danh sách">
            <ChevronLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-navy leading-none mb-1 truncate max-w-[420px]">{workflowData.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusBadge}`}>
                {workflowStatus === 'PUBLISHED' ? 'Published' : workflowStatus === 'SUSPENDED' ? 'Suspended' : 'Draft'}
              </span>
              <span className="text-[11px] text-muted">
                {isDirty ? 'Chưa lưu' : savedAt ?? `Đã lưu lúc ${formatTime(new Date())}`}
              </span>
              {trigger && (
                <span className="text-[11px] text-muted">· Trigger: {trigger.type}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => void handleSave()} className="px-4 py-1.5 text-sm font-medium border border-border text-navy rounded bg-white hover:bg-gray-50 flex items-center gap-2" disabled={!isDirty || saving}>
            <CheckCircleIcon className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu'}
          </button>

          <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title="Thiết lập workflow">
            <Cog8ToothIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setIsVersionHistoryOpen(true)} className="p-1.5 text-gray-400 hover:text-navy rounded hover:bg-gray-100" title="Lịch sử phiên bản">
            <ClockIcon className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-border mx-2"></div>

          <button onClick={handleValidate} className="px-4 py-1.5 text-sm font-medium border border-border text-navy rounded bg-white hover:bg-gray-50 flex items-center gap-1">
            <ShieldCheckIcon className="w-4 h-4" /> Xác minh
          </button>
          <button onClick={() => setIsTestRunnerOpen(true)} className="px-4 py-1.5 text-sm font-medium border border-border text-navy rounded bg-white hover:bg-gray-50 flex items-center gap-1">
            <BeakerIcon className="w-4 h-4" /> Kiểm thử
          </button>
          <button
            className="px-4 py-1.5 bg-primary rounded text-white text-sm font-medium hover:bg-primary-dark flex items-center gap-1"
            onClick={handlePublishClick}
            disabled={publishing || saving}
          >
            <PlayIcon className="w-4 h-4" /> {publishing ? 'Đang xuất bản…' : 'Xuất bản'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 gap-4 z-10 shadow-sm">
          <button
            onClick={() => setPanel(panel === 'trigger-library' ? 'none' : 'trigger-library')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${panel === 'trigger-library' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-navy hover:bg-gray-100'}`}
            title="Triggers"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </button>
          <button
            onClick={() => setPanel(panel === 'node-library' ? 'none' : 'node-library')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${panel === 'node-library' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-navy hover:bg-gray-100'}`}
            title="Nodes"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </button>
          <button
            onClick={() => setPanel(panel === 'context-explorer' ? 'none' : 'context-explorer')}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${panel === 'context-explorer' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-navy hover:bg-gray-100'}`}
            title="Workflow Context"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M9 9h6v6H9z"/></svg>
          </button>
        </div>

        {panel === 'node-library' && <NodeLibraryPanel onClose={closePanels} />}
        {panel === 'trigger-library' && <TriggerLibraryPanel onClose={closePanels} />}
        {panel === 'context-explorer' && <ContextExplorerPanel nodes={nodes} trigger={trigger} variables={variables} onClose={closePanels} />}

        <main className="flex-1 relative bg-page" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
          >
            <Controls className="!bg-surface !border-border !shadow-sm [&>button]:!border-b-border [&>button]:!text-navy" />
            <MiniMap className="!bg-surface !border-border rounded-lg shadow-sm" maskColor="rgba(248, 250, 252, 0.7)" />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
          </ReactFlow>
        </main>

        {selectedElement && selectedElementType === 'node' && (
          <NodeConfigPanel
            node={selectedElement as Node}
            onClose={() => setSelectedElement(null, null)}
            onUpdate={(data) => updateNodeData(selectedElement.id, data)}
            onDelete={() => removeNode(selectedElement.id)}
            canDelete={!['start', 'end'].includes(String((selectedElement as Node).data?.nodeType).toLowerCase())}
          />
        )}
        {selectedElement && selectedElementType === 'edge' && (
          <EdgeConfigPanel
            edge={selectedElement as Edge}
            onClose={() => setSelectedElement(null, null)}
            onUpdate={(data) => updateEdgeData(selectedElement.id, data)}
            onDelete={() => removeEdge(selectedElement.id)}
          />
        )}
      </div>

      <WorkflowSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <TestRunnerDrawer
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
        nodes={nodes}
        edges={edges}
        trigger={trigger}
        variables={variables}
      />

      <ValidationDrawer
        isOpen={isValidationOpen}
        onClose={() => setIsValidationOpen(false)}
        result={validationResult}
        onPublish={confirmPublish}
        onSelectIssue={onSelectIssue}
      />

      <VersionHistoryModal workflowId={persistedId ?? id} isOpen={isVersionHistoryOpen} onClose={() => setIsVersionHistoryOpen(false)} />

      <ConfirmDialog
        isOpen={isPublishConfirmOpen}
        title="Xác nhận publish workflow"
        message={`Publish phiên bản "${workflowData.name}" v${workflowData.version}? Phiên bản này sẽ được dùng cho các instance mới và là snapshot bất biến (không thể sửa trực tiếp sau khi publish).`}
        confirmLabel="Publish"
        onClose={() => setIsPublishConfirmOpen(false)}
        onConfirm={doPublish}
      />

      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="Thay đổi chưa được lưu"
        message={`Workflow "${workflowData.name}" có thay đổi chưa lưu. Nếu rời khỏi trang, các thay đổi này sẽ bị mất.`}
        confirmLabel="Rời khỏi trang"
        cancelLabel="Ở lại chỉnh sửa"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}
