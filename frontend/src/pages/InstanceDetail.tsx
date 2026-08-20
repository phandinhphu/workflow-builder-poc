import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, XCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import CustomNode from '../components/nodes/CustomNode';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { useToasts } from '../components/Toast';
import { getInstance, getWorkflow } from '../data/mockData';
import { api } from '../api/client';
import type { NodeType, WorkflowDefinition } from '../types/workflow';

const customNodeTypes = {
  custom: CustomNode,
};

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PENDING: 'bg-orange-100 text-orange-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  RUNNING: 'Running',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

function designerNodeType(type: NodeType): string {
  const aliases: Partial<Record<NodeType, string>> = { DATA_TRANSFORM: 'data', CODE: 'system', TIMER: 'system', WAIT_EVENT: 'system', PARALLEL_SPLIT: 'system', JOIN: 'system', SUBWORKFLOW: 'system' };
  return aliases[type] ?? type.toLowerCase();
}

function executionLabel(executions: any[]): string {
  if (!executions.length) return 'Chưa thực thi';
  if (executions.some(item => ['WAITING', 'RUNNING'].includes(item.state))) return 'Đang xử lý';
  if (executions.some(item => item.state === 'FAILED')) return 'Thất bại';
  if (executions.some(item => item.state === 'REJECTED')) return 'Yêu cầu làm lại';
  if (executions.every(item => ['COMPLETED', 'SKIPPED'].includes(item.state))) return 'Hoàn tất';
  return executions.at(-1)?.state ?? 'Chưa thực thi';
}

function buildFlowNodes(instanceStatus: string, workflow?: WorkflowDefinition, nodeExecutions: any[] = []): { nodes: Node[]; edges: Edge[] } {
  if (!workflow?.nodes?.length) return { nodes: [], edges: [] };

  const minY = Math.min(...workflow.nodes.map(node => node.position.y));
  const maxY = Math.max(...workflow.nodes.map(node => node.position.y));
  const averageX = workflow.nodes.reduce((sum, node) => sum + node.position.x, 0) / workflow.nodes.length;
  const incoming = new Set(workflow.connections.map(connection => connection.targetNodeId));
  const outgoing = new Set(workflow.connections.map(connection => connection.sourceNodeId));
  const roots = workflow.nodes.filter(node => !incoming.has(node.id));
  const leaves = workflow.nodes.filter(node => !outgoing.has(node.id));
  const isFinished = ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(instanceStatus);

  const nodes: Node[] = [
    { id: '__runtime_start__', type: 'custom', position: { x: averageX, y: minY - 150 }, data: { label: 'Bắt đầu', nodeType: 'start', subLabel: 'Hoàn tất' } },
    ...workflow.nodes.map(node => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        label: node.name,
        nodeType: designerNodeType(node.type),
        subLabel: executionLabel(nodeExecutions.filter(execution => execution.nodeId === node.id)),
      },
    })),
    { id: '__runtime_end__', type: 'custom', position: { x: averageX, y: maxY + 180 }, data: { label: 'Kết thúc', nodeType: 'end', subLabel: isFinished ? instanceStatus : 'Chưa hoàn tất' } },
  ];

  const edges: Edge[] = [
    ...roots.map(node => ({ id: `start-${node.id}`, source: '__runtime_start__', target: node.id })),
    ...workflow.connections.map(connection => {
      const sourceExecution = nodeExecutions.filter(execution => execution.nodeId === connection.sourceNodeId).at(-1);
      const active = ['WAITING', 'RUNNING'].includes(sourceExecution?.state);
      return {
        id: connection.id,
        source: connection.sourceNodeId,
        target: connection.targetNodeId,
        sourceHandle: connection.sourcePort?.toLowerCase() === 'false' ? 'false' : connection.sourcePort?.toLowerCase() === 'true' ? 'true' : undefined,
        label: connection.label,
        animated: active,
        style: { strokeDasharray: active ? '5 5' : undefined },
      };
    }),
    ...leaves.map(node => ({ id: `${node.id}-end`, source: node.id, target: '__runtime_end__', animated: !isFinished })),
  ];
  return { nodes, edges };
}

function maskContext(value: unknown, depth = 0): unknown {
  if (depth > 2) return '••••••';
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string' && value.length > 6) return `${value.slice(0, 2)}•••${value.slice(-2)}`;
    return value;
  }
  if (Array.isArray(value)) return value.map(v => maskContext(v, depth + 1));
  const out: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
    out[k] = /(reason|password|secret|token)/i.test(k) ? '••••••' : maskContext(v, depth + 1);
  });
  return out;
}

export default function InstanceDetail() {
  const { instanceId } = useParams();
  const [activeTab, setActiveTab] = useState<'info' | 'flow' | 'audit' | 'tasks' | 'participants' | 'context'>('flow');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const toasts = useToasts();
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!instanceId) return;
    setLoading(true);
    api.runtime.instance(instanceId).then(setDetail).catch(cause => toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không tải được instance')).finally(() => setLoading(false));
  }, [instanceId]);

  const instance: any = detail ?? (instanceId ? getInstance(instanceId) : undefined);
  const workflow = instance ? getWorkflow(instance.workflowId) : undefined;

  if (loading && !instance) return <div className="h-full grid place-items-center text-sm text-gray-500">Đang tải runtime snapshot…</div>;
  if (!instance) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-gray-500">
        <p className="text-sm mb-4">Không tìm thấy instance</p>
        <Link to="/workflows" className="text-sm font-medium text-primary hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const canCancel = instance.status === 'PENDING' || instance.status === 'RUNNING';
  const flow = buildFlowNodes(instance.status, workflow, detail?.nodeExecutions ?? []);

  const maskedContext = {
    trigger: maskContext(detail?.context?.trigger ?? {}),
    variables: maskContext(detail?.context?.variables ?? {}),
  };
  const timeline = detail?.timeline ?? [];
  const runtimeTasks = detail?.tasks ?? [];

  const doCancel = async () => {
    try {
      await api.runtime.cancel(instance.id);
      setDetail(await api.runtime.instance(instance.id));
      toasts.pushToast('success', `Instance ${instance.requestCode} đã được hủy.`);
      setIsCancelConfirmOpen(false);
    } catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không hủy được instance'); }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/workflows" className="hover:text-primary">Workflow</Link>
          <span>/</span>
          <Link to={workflow ? `/workflows/${workflow.id}` : '/workflows'} className="hover:text-primary">{instance.workflowName}</Link>
          <span>/</span>
          <Link to={workflow ? `/workflows/${workflow.id}/runtime` : '/workflows'} className="hover:text-primary">Theo dõi Runtime</Link>
          <span>/</span>
          <span className="text-navy font-medium">{instance.requestCode}</span>
        </div>
        <div className="flex items-center justify-between">
          <Link to={workflow ? `/workflows/${workflow.id}/runtime` : '/workflows'} className="text-gray-400 hover:text-navy p-2 rounded hover:bg-gray-100 transition-colors" aria-label="Quay lại">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h2 className="text-lg font-bold text-navy flex items-center gap-3 flex-1">
            Request: {instance.requestCode}
          </h2>
          <div className="flex items-center gap-2">
            <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[instance.status])}>
              {STATUS_LABELS[instance.status] || instance.status}
            </span>
            {canCancel && (
              <button
                onClick={() => setIsCancelConfirmOpen(true)}
                className="px-4 py-2 text-sm font-medium border border-danger/40 text-danger rounded bg-white hover:bg-red-50 flex items-center gap-1"
              >
                <XCircleIcon className="w-4 h-4" /> Hủy instance
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div>
              <span className="block text-xs text-muted uppercase tracking-wide">Workflow</span>
              <span className="text-sm font-medium text-navy">{instance.workflowName} (v{instance.workflowVersion})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-100 border border-border rounded text-xs text-navy font-medium">
                {STATUS_LABELS[instance.status] || instance.status}
              </span>
              <span className={clsx("px-2 py-1 border rounded text-xs font-medium", instance.slaStatus === 'OVERDUE' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700')}>
                {instance.slaStatus === 'OVERDUE' ? 'Overdue' : 'On-time'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex border-b border-border bg-white">
          {[
            { id: 'info', name: 'Thông tin' },
            { id: 'flow', name: 'View Flow' },
            { id: 'audit', name: 'Audit & History' },
            { id: 'tasks', name: 'Tasks' },
            { id: 'context', name: 'Workflow Context' },
            ...(instance.participants ? [{ id: 'participants' as const, name: `Người tham gia (${instance.participantCount ?? instance.participants.length})` }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-6 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.id ? "text-primary" : "text-gray-500 hover:text-navy"
              )}
            >
              {tab.name}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-page relative">

          {activeTab === 'info' && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4 border-b border-gray-100 pb-2">Thông tin instance</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Request ID</span>
                    <span className="text-sm font-medium text-navy">{instance.requestCode}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Người tạo</span>
                    <span className="text-sm font-medium text-navy">{instance.creatorName}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Thời gian bắt đầu</span>
                    <span className="text-sm font-medium text-navy">{instance.startedAt}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Bước hiện tại</span>
                    <span className="text-sm font-medium text-navy">{instance.currentStepLabels.join(', ')}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Người xử lý</span>
                    <span className="text-sm font-medium text-navy">{instance.activeAssignees.length > 0 ? instance.activeAssignees.join(', ') : 'Hệ thống tự động'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">SLA</span>
                    <span className={clsx("inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase", instance.slaStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {instance.slaStatus === 'OVERDUE' ? 'Overdue' : 'On-time'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Due Date</span>
                    <span className="text-sm font-medium text-navy">
                      {runtimeTasks.find((task: any) => ['PENDING', 'CLAIMED', 'OVERDUE'].includes(task.status))?.dueAt ?? 'Không có task đang chờ'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                  <h3 className="text-base font-bold text-navy">Dữ liệu Context</h3>
                  <span className="text-xs text-muted">Dữ liệu nhạy cảm được che để bảo mật</span>
                </div>
                <div className="bg-gray-50 rounded border border-gray-200 p-4 font-mono text-xs overflow-auto">
                  <pre className="text-gray-700">{JSON.stringify(maskedContext, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="absolute inset-0">
              <ReactFlow
                nodes={flow.nodes}
                edges={flow.edges}
                nodeTypes={customNodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Controls className="!bg-white !border-border !shadow-sm" />
                <MiniMap className="!bg-white !border-border rounded-lg shadow-sm" maskColor="rgba(248, 250, 252, 0.7)" />
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#cbd5e1" />
              </ReactFlow>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-navy">Timeline Execution</h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-gray-100 border border-border rounded text-xs text-navy font-medium flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success"></div> Thành công</span>
                    <span className="px-2 py-1 bg-gray-100 border border-border rounded text-xs text-navy font-medium flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning"></div> Đang xử lý</span>
                  </div>
                </div>

                <div className="relative pl-8 border-l-2 border-gray-200 space-y-8 py-2">
                  {timeline.map((entry: any) => (
                    <div key={entry.id} className="relative">
                      <div className={clsx(
                        "absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white flex items-center justify-center shadow-sm",
                        entry.state === 'success' ? 'bg-success' : entry.state === 'running' ? 'bg-warning' : 'bg-gray-300'
                      )}>
                        {entry.state === 'success' && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        )}
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-navy">{entry.title}</p>
                          <p className="text-xs text-muted mt-1">{entry.description}</p>
                          {entry.state === 'running' && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs font-medium">
                              SLA: Còn 24 giờ
                            </div>
                          )}
                        </div>
                        {entry.time && <span className="text-xs font-medium text-gray-500">{entry.time}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4">Danh sách Task</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Task ID</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Người nhận</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Người tham gia</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Trạng thái</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Due Date</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runtimeTasks.map((task: any) => (
                        <tr key={task.id} className="border-b border-border hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-sm text-navy">{task.id}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{task.assignee}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{task.participantId ? instance.participants?.find((participant: any) => participant.id === task.participantId)?.displayName ?? '—' : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium",
                              task.status === 'PENDING' ? 'bg-green-100 text-green-700' :
                              task.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            )}>
                              {task.status === 'PENDING' ? 'Pending' : task.status === 'OVERDUE' ? 'Overdue' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{task.dueAt}</td>
                          <td className="px-3 py-2 text-right">
                            {['PENDING', 'CLAIMED', 'OVERDUE'].includes(task.status) ? (
                              <Link to="/my-tasks" className="text-primary hover:text-primary-dark text-sm font-medium">Mở task</Link>
                            ) : <span className="text-xs text-muted">Đã xử lý</span>}
                          </td>
                        </tr>
                      ))}
                      {runtimeTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted">Không có task nào</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4">Workflow Context đầy đủ</h3>
                <div className="bg-gray-50 rounded border border-gray-200 p-4 font-mono text-xs overflow-auto">
                  <pre className="text-gray-700">{JSON.stringify(detail?.context ?? maskedContext, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && instance.participants && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                  <h3 className="text-base font-bold text-navy">Participant Snapshot</h3>
                  <span className="text-xs text-muted">Kỳ: {instance.period ?? '—'} — chốt khi instance bắt đầu</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-border rounded-lg p-4 text-center">
                    <span className="block text-2xl font-bold text-navy">{instance.participantCount ?? instance.participants.length}</span>
                    <span className="text-xs text-muted">Tổng participants</span>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <span className="block text-2xl font-bold text-green-700">{instance.participants.filter((p: any) => p.status === 'COMPLETED').length}</span>
                    <span className="text-xs text-green-600">Completed</span>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <span className="block text-2xl font-bold text-yellow-700">{instance.participants.filter((p: any) => p.status === 'IN_PROGRESS').length}</span>
                    <span className="text-xs text-yellow-600">In progress</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4">Danh sách người tham gia</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Participant</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Bước hiện tại</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Assignee hiện tại</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Trạng thái</th>
                        <th className="px-3 py-2 font-semibold text-muted text-xs uppercase tracking-wider border-b border-border">Hoàn thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instance.participants.map((p: any) => (
                        <tr key={p.id} className="border-b border-border hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <span className="text-sm font-medium text-navy">{p.displayName}</span>
                            <span className="block text-xs text-muted">{p.department}</span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{p.currentStepLabel ?? '—'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">{p.currentAssignee ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={clsx(
                              "inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium",
                              p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              p.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            )}>
                              {p.status === 'COMPLETED' ? 'Completed' : p.status === 'IN_PROGRESS' ? 'In Progress' : 'Not started'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{p.completedAt ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(instance.participantCount ?? 0) > instance.participants.length && (
                  <p className="text-xs text-muted mt-3">
                    * Hiển thị {instance.participants.length} / {instance.participantCount} participants trong snapshot.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Hủy instance"
        message={`Hủy instance ${instance.requestCode}? Quy trình sẽ dừng ngay lập tức và không thể khôi phục.`}
        confirmLabel="Hủy instance"
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={doCancel}
      />

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}
