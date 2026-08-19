import { useCallback, useRef, useEffect, useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, type Edge, type ReactFlowInstance, BackgroundVariant, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Link, useParams, useSearchParams, useLocation, useBlocker } from 'react-router-dom';
import { ChevronLeftIcon, Cog8ToothIcon, ClockIcon, CheckCircleIcon, PlayIcon, ShieldCheckIcon, BeakerIcon } from '@heroicons/react/24/outline';
import CustomNode from '../components/nodes/CustomNode';
import WorkflowSettingsModal from '../components/WorkflowSettingsModal';
import ValidationDrawer, { validateWorkflow, type ValidationResult } from '../components/ValidationDrawer';
import VersionHistoryModal from '../components/VersionHistoryModal';
import NodeLibraryPanel from '../components/NodeLibraryPanel';
import TriggerLibraryPanel from '../components/TriggerLibraryPanel';
import NodeConfigPanel from '../components/NodeConfigPanel';
import EdgeConfigPanel from '../components/EdgeConfigPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import TestRunnerDrawer from '../components/TestRunnerDrawer';
import Toast, { useToasts } from '../components/Toast';
import { useDesignerStore } from '../stores/designerStore';
import { getWorkflow, workflowTemplates, addVersionEntry } from '../data/mockData';
import type { TriggerType } from '../types/workflow';

const nodeTypes = {
  custom: CustomNode,
};

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
    case 'APPROVAL': return 'approval';
    case 'REVIEW': return 'review';
    case 'ASSIGNMENT': return 'assignment';
    case 'NOTIFICATION': return 'notification';
    case 'CONDITION': return 'condition';
    case 'FORM': return 'form';
    case 'HTTP': return 'http';
    case 'DATA': return 'data';
    case 'CODE': return 'code';
    default: return 'assignment';
  }
}

function buildWorkflowNodes(wf?: ReturnType<typeof getWorkflow>): { nodes: Node[]; edges: Edge[] } {
  const triggerType = wf?.trigger?.type ?? 'manual';
  const startNode: Node = { id: 'start-1', type: 'custom', data: { label: 'Bắt đầu', nodeType: 'start', subLabel: triggerTypeLabel(triggerType), triggerType }, position: { x: 300, y: 50 } };
  const endNode: Node = { id: 'end-1', type: 'custom', data: { label: 'Kết thúc', nodeType: 'end' }, position: { x: 300, y: 50 } };

  const defs = wf?.nodes ?? [];
  if (defs.length === 0) {
    endNode.position = { x: 300, y: 210 };
    return {
      nodes: [startNode, endNode],
      edges: [{ id: 'e-1', source: 'start-1', target: 'end-1', animated: true, data: { label: '' } }],
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
  if (!targets.has(defs[0].id)) pushEdge('start-1', defs[0].id);
  if (!sources.has(lastDef.id)) pushEdge(lastDef.id, 'end-1');
  conns.forEach(c => {
    const isCondition = defs.find(d => d.id === c.sourceNodeId)?.type === 'CONDITION';
    const port = isCondition ? (c.sourcePort === 'false' ? 'false' : 'true') : undefined;
    const label = isCondition ? (port === 'false' ? 'FALSE' : 'TRUE') : (c.label ?? '');
    pushEdge(c.sourceNodeId, c.targetNodeId, port, label);
  });

  return { nodes, edges };
}

export default function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const templateId = searchParams.get('template');
  const createState = (location.state ?? {}) as Record<string, string>;

  const store = useDesignerStore();
  const {
    workflowData, nodes, edges, selectedElement, selectedElementType,
    isDirty, savedAt, panel, trigger, variables,
    onNodesChange, onEdgesChange, onConnect, setNodes,
    setSelectedElement, setIsDirty, setSavedAt, setPanel, setWorkflowData,
    updateNodeData, updateEdgeData, removeEdge, reset, setTrigger,
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

  const handleSave = () => {
    const now = new Date();
    setIsDirty(false);
    setSavedAt(`Đã lưu lúc ${formatTime(now)}`);
    toasts.pushToast('success', `Đã lưu workflow "${workflowData.name}" (bản nháp ${workflowData.version}).`);
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

  const doPublish = () => {
    setIsPublishConfirmOpen(false);
    setIsDirty(false);
    setWorkflowData({ status: 'PUBLISHED' });
    setIsDirty(false);
    setSavedAt(`Đã xuất bản lúc ${formatTime(new Date())}`);
    addVersionEntry(workflowData.version, workflowData.owner, [`Publish phiên bản ${workflowData.version} của "${workflowData.name}"`]);
    toasts.pushToast('success', `Workflow "${workflowData.name}" v${workflowData.version} đã được publish thành công.`);
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
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 z-20 shadow-sm relative">
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
          <button onClick={handleSave} className="px-4 py-1.5 text-sm font-medium border border-border text-navy rounded bg-white hover:bg-gray-50 flex items-center gap-2" disabled={!isDirty}>
            <CheckCircleIcon className="w-4 h-4" /> Lưu
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
          >
            <PlayIcon className="w-4 h-4" /> Xuất bản
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 gap-4 z-20 shadow-sm">
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
        </div>

        {panel === 'node-library' && <NodeLibraryPanel onClose={closePanels} />}
        {panel === 'trigger-library' && <TriggerLibraryPanel onClose={closePanels} />}

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

      <VersionHistoryModal isOpen={isVersionHistoryOpen} onClose={() => setIsVersionHistoryOpen(false)} />

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