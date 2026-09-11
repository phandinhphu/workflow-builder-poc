import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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
        sourceHandle: connection.sourcePort?.toLowerCase() === 'false' ? 'false' :
                      connection.sourcePort?.toLowerCase() === 'true' ? 'true' :
                      connection.sourcePort?.toUpperCase() === 'APPROVED' ? 'APPROVED' :
                      connection.sourcePort?.toUpperCase() === 'REJECTED' ? 'REJECTED' :
                      undefined,
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
  const timeline = detail?.timeline ?? [];
  const runtimeTasks = detail?.tasks ?? [];
  const maskedContext = {
    trigger: maskContext(detail?.context?.trigger ?? {}),
    variables: maskContext(detail?.context?.variables ?? {}),
  };

  const formatEventTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return timeStr;
    }
  };

  const groupedSteps = useMemo(() => {
    const groups: { stepNo: number; stepName: string; nodeType: string; state: string; events: any[] }[] = [];
    const map = new Map<string, typeof groups[0]>();

    timeline.forEach((entry: any) => {
      const stepNo = entry.stepNo || 1;
      const stepName = entry.stepName || 'Khởi tạo quy trình';
      const key = `${stepNo}_${stepName}`;
      if (!map.has(key)) {
        const group = {
          stepNo,
          stepName,
          nodeType: entry.nodeType || 'TRIGGER',
          state: 'completed',
          events: []
        };
        map.set(key, group);
        groups.push(group);
      }
      const grp = map.get(key)!;
      grp.events.push(entry);
      if (entry.state === 'failed') {
        grp.state = 'failed';
      } else if (entry.state === 'waiting' && grp.state !== 'failed') {
        grp.state = 'waiting';
      } else if (entry.state === 'running' && grp.state !== 'failed' && grp.state !== 'waiting') {
        grp.state = 'running';
      }
    });
    return groups;
  }, [timeline]);

  const doCancel = async () => {
    try {
      await api.runtime.cancel(instance?.id);
      setDetail(await api.runtime.instance(instance?.id));
      toasts.pushToast('success', `Instance ${instance?.requestCode} đã được hủy.`);
      setIsCancelConfirmOpen(false);
    } catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không hủy được instance'); }
  };

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
  const { nodes, edges } = buildFlowNodes(instance.status, workflow, detail?.nodeExecutions ?? []);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/workflows" className="hover:text-primary">Workflow</Link>
          <span>/</span>
          <Link to={`/workflows/${instance.workflowId}`} className="hover:text-primary">{instance.workflowName}</Link>
          <span>/</span>
          <Link to={`/workflows/${instance.workflowId}/instances`} className="hover:text-primary">Theo dõi Runtime</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{instance.requestCode}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/workflows/${instance.workflowId}/instances`} className="p-1 hover:bg-gray-100 rounded text-gray-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy flex items-center gap-2">
                Request: {instance.requestCode}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={clsx(
              "px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider",
              instance.status === 'RUNNING' ? 'bg-blue-50 text-primary border border-blue-200' :
              instance.status === 'COMPLETED' ? 'bg-green-50 text-success border border-green-200' :
              instance.status === 'FAILED' ? 'bg-red-50 text-danger border border-red-200' :
              'bg-gray-50 text-muted border border-border'
            )}>
              {instance.status}
            </span>
            {canCancel && (
              <button
                onClick={() => setIsCancelConfirmOpen(true)}
                className="btn-danger text-xs px-3 py-1.5"
              >
                Hủy Instance
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg shadow-sm flex-1 flex flex-col min-h-0">
        <div className="border-b border-border px-6 pt-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs text-muted uppercase font-semibold">Workflow</span>
              <p className="text-sm font-bold text-navy flex items-center gap-2 mt-0.5">
                {instance.workflowName} ({instance.workflowVersion})
                <span className="text-[11px] font-normal px-1.5 py-0.5 bg-gray-100 border border-border rounded text-gray-600">
                  {instance.status === 'RUNNING' ? 'In-progress' : instance.status === 'COMPLETED' ? 'Completed' : instance.status}
                </span>
                <span className={clsx(
                  "text-[11px] font-normal px-1.5 py-0.5 rounded border",
                  instance.slaStatus === 'OVERDUE' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                )}>
                  {instance.slaStatus === 'OVERDUE' ? 'Overdue' : 'On-time'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { id: 'info', label: 'Thông tin' },
              { id: 'flow', label: 'View Flow' },
              { id: 'audit', label: 'Audit & History' },
              { id: 'tasks', label: 'Tasks' },
              { id: 'context', label: 'Workflow Context' },
            //   { id: 'participants', label: `Người tham gia (${instance.participants?.length ?? instance.participantCount ?? 0})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "px-4 py-2 border-b-2 text-sm font-medium transition-colors -mb-[1px]",
                  activeTab === tab.id
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted hover:text-navy"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 bg-[#F8FAFC]">
          {activeTab === 'info' && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4">Thông tin Thực thi</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted">Mã yêu cầu:</span> <span className="font-semibold text-navy ml-2">{instance.requestCode}</span></div>
                  <div><span className="text-muted">Người tạo:</span> <span className="font-semibold text-navy ml-2">{instance.creatorName}</span></div>
                  <div><span className="text-muted">Bắt đầu lúc:</span> <span className="font-medium text-gray-700 ml-2">{instance.startedAt}</span></div>
                  <div><span className="text-muted">Kết thúc lúc:</span> <span className="font-medium text-gray-700 ml-2">{instance.completedAt ?? '—'}</span></div>
                  {/* <div><span className="text-muted">Số người tham gia:</span> <span className="font-semibold text-navy ml-2">{instance.participantCount}</span></div> */}
                  {/* <div><span className="text-muted">Số người hoàn thành:</span> <span className="font-semibold text-navy ml-2">{instance.completedParticipantCount}</span></div> */}
                  <div><span className="text-muted">SLA Status:</span> <span className="font-semibold text-navy ml-2">{instance.slaStatus ?? 'ON_TIME'}</span></div>
                  <div><span className="text-muted">Trạng thái:</span> <span className="font-semibold text-navy ml-2">{instance.status}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="h-[600px] w-full bg-white relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
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
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-navy">Audit & History — Tiến trình thực thi theo Bước</h3>
                  <p className="text-xs text-muted mt-0.5">Theo dõi chi tiết từng bước và nhật ký sự kiện của phiên chạy</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-white border border-border rounded-full text-xs text-navy font-medium flex items-center gap-1.5 shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Hoàn thành
                  </span>
                  <span className="px-2.5 py-1 bg-white border border-border rounded-full text-xs text-navy font-medium flex items-center gap-1.5 shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Đang chờ xử lý
                  </span>
                </div>
              </div>

              {groupedSteps.length === 0 ? (
                <div className="bg-white border border-border rounded-xl p-8 text-center text-muted text-sm shadow-sm">
                  Chưa có dữ liệu lịch sử cho quy trình này
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedSteps.map((step, sIdx) => {
                    const isWaiting = step.state === 'waiting';
                    const isRunning = step.state === 'running';
                    const isFailed = step.state === 'failed';

                    return (
                      <div
                        key={`step-${step.stepNo}-${sIdx}`}
                        className={clsx(
                          "bg-white border rounded-xl p-5 shadow-xs transition-all",
                          isWaiting ? "border-amber-300 ring-1 ring-amber-200" :
                          isRunning ? "border-blue-300 ring-1 ring-blue-200" :
                          isFailed ? "border-red-300" : "border-border"
                        )}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <span className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs",
                              isWaiting ? "bg-amber-100 text-amber-800" :
                              isRunning ? "bg-blue-100 text-blue-800" :
                              isFailed ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                            )}>
                              {step.stepNo}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-navy">{step.stepName}</h4>
                                {step.nodeType && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide">
                                    {step.nodeType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isWaiting && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Đang chờ xử lý
                              </span>
                            )}
                            {isRunning && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Đang thực thi
                              </span>
                            )}
                            {isFailed && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                                Thất bại
                              </span>
                            )}
                            {!isWaiting && !isRunning && !isFailed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Hoàn thành
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3.5 space-y-3 pl-1">
                          {step.events.map((entry: any, eIdx: number) => {
                            const isEvtSuccess = entry.state === 'success' || entry.state === 'completed';
                            const isEvtWaiting = entry.state === 'waiting';
                            const isEvtFailed = entry.state === 'failed';

                            return (
                              <div key={entry.id || eIdx} className="flex items-start gap-3 text-xs">
                                <div className="mt-0.5">
                                  <div className={clsx(
                                    "w-4 h-4 rounded-full flex items-center justify-center",
                                    isEvtFailed ? "bg-red-500 text-white" :
                                    isEvtWaiting ? "bg-amber-500 text-white" :
                                    isEvtSuccess ? "bg-emerald-500 text-white" : "bg-blue-400 text-white"
                                  )}>
                                    {isEvtSuccess ? (
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                    ) : isEvtWaiting ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    ) : (
                                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between gap-2">
                                    <p className="font-semibold text-navy text-xs">{entry.title}</p>
                                    {entry.time && (
                                      <span className="text-[11px] text-gray-400 whitespace-nowrap font-mono">
                                        {formatEventTime(entry.time)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mt-0.5 text-xs leading-relaxed">{entry.description}</p>

                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    {entry.actorName && entry.actorName !== 'Hệ thống' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium">
                                        👤 {entry.actorName}
                                      </span>
                                    )}
                                    {entry.slaText && (
                                      <span className={clsx(
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border",
                                        entry.slaText.includes("Quá hạn")
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      )}>
                                        ⏱️ {entry.slaText}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
