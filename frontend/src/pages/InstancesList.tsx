import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlayIcon, PlusIcon, XMarkIcon, CheckCircleIcon, BellIcon, UsersIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Pagination from '../components/Pagination';
import Toast, { useToasts } from '../components/Toast';
import { getInstancesByWorkflow, getWorkflow, resolveParticipantScope } from '../data/mockData';
import type { WorkflowInstanceSummary, WorkflowParticipantEntry } from '../types/workflow';

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

const PAGE_SIZE = 5;

function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export default function InstancesList() {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [period, setPeriod] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const toasts = useToasts();

  const workflow = id ? getWorkflow(id) : undefined;
  const allInstances = getInstancesByWorkflow(id);
  const [localInstances, setLocalInstances] = useState<WorkflowInstanceSummary[]>(allInstances);

  const resolvedUsers = resolveParticipantScope(workflow?.participantScope);

  const filtered = useMemo(() => {
    return localInstances.filter(inst => {
      const matchesSearch =
        inst.requestCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inst.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.currentStepLabels.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || inst.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [localInstances, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleCreateInstance = () => {
    if (!workflow) return;
    const p = period.trim() || `Kỳ ${nowStamp().slice(0, 7)}`;
    const participants: WorkflowParticipantEntry[] = resolvedUsers.map((u, idx) => ({
      id: nextId(`p-${idx}`),
      userId: u.id,
      displayName: u.displayName,
      department: u.department,
      currentStepLabel: workflow.nodes[0]?.name ?? 'Bước đầu tiên',
      currentAssignee: u.displayName,
      status: 'NOT_STARTED',
    }));
    const firstNodeLabel = workflow.nodes[0]?.name ?? 'Bước đầu tiên';
    const notif = workflow.participantNotification;
    const newInstance: WorkflowInstanceSummary = {
      id: nextId('inst'),
      requestCode: `EVAL-${p.replace(/\D/g, '').slice(0, 6) || nowStamp().slice(2, 10).replace(/\D/g, '')}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowVersion: workflow.draftVersion,
      creatorId: 'U000',
      creatorName: 'Nguyễn Văn B',
      status: 'RUNNING',
      currentStepLabels: [firstNodeLabel ?? 'Bước đầu tiên'],
      activeAssignees: resolvedUsers.slice(0, 3).map(u => u.displayName),
      startedAt: nowStamp(),
      slaStatus: 'ON_TIME',
      period: p,
      participantCount: resolvedUsers.length,
      participants,
    };
    setLocalInstances(prev => [newInstance, ...prev]);
    setCreateOpen(false);
    setPeriod('');
    if (notifyEnabled && notif?.enabled) {
      toasts.pushToast('success', `Đã tạo instance "${p}" — ${resolvedUsers.length} participants được snapshot và thông báo qua ${notif.channels.join(', ')}`);
    } else {
      toasts.pushToast('success', `Đã tạo instance "${p}" với ${resolvedUsers.length} participants (snapshot đã chốt)`);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/workflows" className="hover:text-primary">Workflow</Link>
          <span>/</span>
          <Link to={id ? `/workflows/${id}` : '/workflows'} className="hover:text-primary">{workflow?.name ?? 'Workflow'}</Link>
          <span>/</span>
          <span className="text-navy font-medium">Theo dõi Runtime</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-navy flex items-center gap-3">
            Theo dõi Runtime
          </h1>
          <div className="flex items-center gap-3">
            {workflow?.participantScope?.enabled && (
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-primary rounded-md px-4 py-2 hover:bg-primary-dark"
              >
                <PlusIcon className="w-4 h-4" /> Tạo instance mới
              </button>
            )}
            <Link to="/workflows" className="text-sm font-medium text-navy border border-border rounded px-4 py-2 hover:bg-gray-50">
              Quay lại
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">

        <div className="p-4 border-b border-border flex items-center gap-3 bg-gray-50/50">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã yêu cầu, người tạo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary w-44"
            >
              <option value="All">Tất cả</option>
              <option value="PENDING">Pending</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Request ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Người tạo yêu cầu</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Bước hiện tại</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Người xử lý hiện tại</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Participants</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Thời gian bắt đầu</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">SLA</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(instance => (
                <tr key={instance.id} className="border-b border-border hover:bg-gray-50 bg-white group cursor-pointer">
                  <td className="py-3 px-4 text-sm font-medium text-primary">
                    <Link to={`/workflows/${instance.workflowId}/instances/${instance.id}`} className="hover:underline">
                      {instance.requestCode}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{instance.creatorName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{instance.currentStepLabels.join(', ')}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {instance.activeAssignees.length > 0 ? (
                      <>
                        {instance.activeAssignees.slice(0, 2).join(', ')}
                        {instance.activeAssignees.length > 2 && (
                          <span className="text-muted"> +{instance.activeAssignees.length - 2} người</span>
                        )}
                      </>
                    ) : 'Hệ thống tự động'}
                  </td>
                  <td className="py-3 px-4">
                    {instance.participantCount !== undefined ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        <UsersIcon className="w-3 h-3" /> {instance.participantCount}
                      </span>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", STATUS_STYLES[instance.status] || 'bg-gray-100 text-gray-700')}>
                      {STATUS_LABELS[instance.status] || instance.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{instance.startedAt}</td>
                  <td className="py-3 px-4">
                    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      instance.slaStatus === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    )}>
                      {instance.slaStatus === 'OVERDUE' ? 'Overdue' : 'On-time'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paged.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <PlayIcon className="w-8 h-8 mb-2 opacity-30" />
              <p>Không tìm thấy instance nào</p>
            </div>
          )}
        </div>

        <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </div>

      {createOpen && workflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-xl font-bold text-navy">Tạo instance mới</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kỳ đánh giá <span className="text-danger">*</span></label>
                <input
                  type="text"
                  placeholder="VD: 08/2026"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="bg-gray-50 border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-navy mb-2">Bước 1 — Resolve participants (rule)</h4>
                <p className="text-xs text-muted mb-2 font-mono">{workflow.participantScope?.selectorConfig?.rule ?? 'employee.status == ACTIVE'}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <CheckCircleIcon className="w-4 h-4 text-success" />
                  <span><strong className="text-navy">{resolvedUsers.length} người</strong> sẽ được resolve khi instance bắt đầu</span>
                </div>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside bg-white p-3 border border-border rounded">
                  {resolvedUsers.slice(0, 5).map(u => <li key={u.id}>{u.displayName} — {u.department}</li>)}
                  {resolvedUsers.length > 5 && <li className="text-muted">...và {resolvedUsers.length - 5} người khác</li>}
                </ul>
              </div>

              <div className="bg-gray-50 border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-navy mb-2">Bước 2 — Snapshot & tạo instance</h4>
                <p className="text-xs text-muted">Danh sách được chốt tại thời điểm này. Người vào công ty giữa kỳ sẽ thuộc kỳ sau (snapshot policy: {workflow.participantScope?.snapshotPolicy === 'AT_INSTANCE_START' ? 'chốt khi bắt đầu' : 'resolve động'}).</p>
              </div>

              <div className="bg-gray-50 border border-border rounded-md p-4">
                <h4 className="text-sm font-medium text-navy mb-2">Bước 3 — Thông báo người tham gia</h4>
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEnabled}
                    onChange={e => setNotifyEnabled(e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <BellIcon className="w-4 h-4 text-primary" /> Gửi thông báo khi đợt bắt đầu
                </label>
                {notifyEnabled && workflow.participantNotification?.enabled && (
                  <div className="text-xs text-gray-600 space-y-1 bg-white border border-border rounded p-3">
                    <p className="font-medium text-navy">
                      {workflow.participantNotification.titleTemplate.replace('{{workflow.period}}', period.trim() || '08/2026')}
                    </p>
                    <p>
                      {workflow.participantNotification.bodyTemplate
                        .replace('{{workflow.period}}', period.trim() || '08/2026')
                        .replace('{{workflow.dueDate}}', '31/08/2026')}
                    </p>
                    <p className="text-muted">Kênh: {workflow.participantNotification.channels.join(', ')} → {resolvedUsers.length} thông báo</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateInstance}
                className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark"
              >
                Tạo instance
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}