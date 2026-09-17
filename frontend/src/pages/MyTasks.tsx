import { useState, useEffect } from 'react';
import { useMyTasksStore } from '../stores/myTasksStore';
import { Loader2, RefreshCw, Eye, Search, Tag } from 'lucide-react';
import AssignmentTaskModal from '../components/node/AssignmentTaskModal';
import TaskApprovalModal from '../components/tasks/TaskApprovalModal';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  CLAIMED: { label: 'Claimed', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

const hasTaskBeenClaimed = (task: any) => Boolean(
  task.claimedAt || task.claimantId || task.status === 'CLAIMED' || task.status === 'IN_PROGRESS'
);

export default function MyTasksPage() {
  const { tasks, total, loading, error, loadTasks, claimTask, completeTask, rejectTask } = useMyTasksStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = (tasks as any[]).filter((task: any) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchCode = task.ticketCode?.toLowerCase().includes(q);
      const matchCategory = task.categoryName?.toLowerCase().includes(q);
      const matchInitiator = task.initiator?.displayName?.toLowerCase().includes(q) || task.initiator?.userId?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchCategory && !matchInitiator) return false;
    }
    return true;
  });

  const handleClaim = async (taskId: string) => {
    try {
      const result = await claimTask(taskId);
      if (result.success) { setToast({ message: 'Task claimed successfully', type: 'success' }); await loadTasks(); }
      else setToast({ message: result.message, type: 'error' });
    } catch (cause) { setToast({ message: cause instanceof Error ? cause.message : 'Không thể nhận task', type: 'error' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const handleComplete = async (taskId: string, data: Record<string, unknown> = {}, comment?: string) => {
    try {
      const result = await completeTask(taskId, data, comment);
      if (result.success) { setToast({ message: 'Task completed', type: 'success' }); setSelectedTask(null); await loadTasks(); }
    } catch (cause) { setToast({ message: cause instanceof Error ? cause.message : 'Không thể hoàn thành task', type: 'error' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const handleReject = async (taskId: string, reason?: string, reasonRequired = false) => {
    const normalizedReason = reason?.trim();
    if (reasonRequired && !normalizedReason) {
      setToast({ message: 'Vui lòng nhập lý do từ chối', type: 'error' });
      return;
    }
    try {
      const result = await rejectTask(taskId, normalizedReason);
      if (result.success) {
        setToast({
          message: reasonRequired ? 'Đã từ chối và gửi lý do đến người được phê duyệt' : 'Task rejected',
          type: 'success'
        });
        setSelectedTask(null);
        setShowRejectForm(false);
        setRejectionReason('');
        await loadTasks();
      }
    } catch (cause) { setToast({ message: cause instanceof Error ? cause.message : 'Không thể từ chối task', type: 'error' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const openTask = (task: any) => {
    const initial: Record<string, unknown> = {};
    (task.formFields ?? []).forEach((field: any) => {
      const key = field.outputMapping || field.id;
      if (field.resolvedValue !== undefined && field.resolvedValue !== null) initial[key] = field.resolvedValue;
      else if (field.type === 'checkbox') initial[key] = false;
    });
    setFormData(initial);
    setShowRejectForm(false);
    setRejectionReason('');
    setSelectedTask(task);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý các nhiệm vụ được giao</p>
        </div>
        <button onClick={() => loadTasks()} className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total Tasks</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-yellow-600">{(tasks as any[]).filter((t: any) => t.status === 'PENDING').length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-green-600">{(tasks as any[]).filter((t: any) => t.status === 'COMPLETED').length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-red-600">{(tasks as any[]).filter((t: any) => t.status === 'REJECTED').length}</p>
          <p className="text-xs text-gray-500">Rejected</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-2xl font-bold text-gray-500">{(tasks as any[]).filter((t: any) => t.status === 'CANCELLED').length}</p>
          <p className="text-xs text-gray-500">Cancelled</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="CLAIMED">Claimed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">All</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full border rounded pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700">Loading tasks...</span>
        </div>
      )}

      {error && <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm mb-4">{error}</div>}

      <div className="bg-white border rounded-lg overflow-hidden shadow-2xs">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Nhiệm vụ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Phiếu yêu cầu</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Người nộp đơn</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Loại bước</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Mức ưu tiên</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Hạn xử lý</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.map((task: any, index: number) => {
              const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';
              const isApproval = task.taskType === 'APPROVAL' || task.taskType === 'REVIEW';
              const isClosedOrCancelled = task.status === 'COMPLETED' || task.status === 'REJECTED' || task.status === 'CANCELLED';
              return (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {task.ticketCode ? (
                      <div>
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          <Tag className="w-3 h-3" />
                          {task.ticketCode}
                        </span>
                        {task.categoryName && <p className="text-xs text-gray-500 mt-0.5">{task.categoryName}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.initiator ? (
                      <div>
                        <p className="text-xs font-bold text-gray-900">{task.initiator.displayName || task.initiator.userId}</p>
                        <p className="text-[11px] text-gray-500">{task.initiator.departmentName || task.initiator.email || task.initiator.userId}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-semibold text-gray-700">{task.taskType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_BADGES[task.priority]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITY_BADGES[task.priority]?.label || task.priority || 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.dueAt ? (
                      <span className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                        {new Date(task.dueAt).toLocaleDateString()}
                        {isOverdue && ' (Quá hạn)'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGES[task.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_BADGES[task.status]?.label || task.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {isApproval ? (
                        <button
                          onClick={() => openTask(task)}
                          className={`px-2.5 py-1 border rounded-md text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                            task.status === 'CANCELLED'
                              ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                          }`}
                          title={task.status === 'CANCELLED' ? 'Xem chi tiết (Đã hủy)' : isClosedOrCancelled ? 'Xem lại kết quả' : 'Mở form xem và duyệt'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isClosedOrCancelled ? 'Xem lại' : 'Duyệt'}
                        </button>
                      ) : (
                        <>
                          {(hasTaskBeenClaimed(task) || task.status === 'PENDING' || task.status === 'CANCELLED') && (
                            <button
                              onClick={() => openTask(task)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                              title={task.status === 'CANCELLED' ? 'Xem task đã hủy' : 'Mở task để xử lý'}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          {task.status === 'PENDING' && !hasTaskBeenClaimed(task) && (
                            <button
                              onClick={() => handleClaim(task.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 font-medium"
                            >
                              Claim
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTasks.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            <p>Không có nhiệm vụ nào</p>
          </div>
        )}
      </div>

      {selectedTask && (
        selectedTask.taskType === 'APPROVAL' || selectedTask.taskType === 'REVIEW' ? (
          <TaskApprovalModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onApprove={async (comment) => {
              await handleComplete(selectedTask.id, {}, comment);
            }}
            onReject={async (comment) => {
              await handleReject(selectedTask.id, comment, true);
            }}
          />
        ) : selectedTask.taskType === 'ASSIGNMENT' && selectedTask.status === 'CLAIMED' ? (
          <AssignmentTaskModal
            taskId={selectedTask.id}
            taskTitle={selectedTask.title}
            onComplete={async (data) => {
              await handleComplete(selectedTask.id, data);
            }}
            onClose={() => setSelectedTask(null)}
          />
        ) : (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{selectedTask.title}</h2>
            <p className="text-sm text-gray-600 mb-4">{selectedTask.description || 'No description'}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGES[selectedTask.status]?.color || 'bg-gray-100'}`}>
                  {STATUS_BADGES[selectedTask.status]?.label || selectedTask.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGES[selectedTask.priority]?.color || 'bg-gray-100'}`}>
                  {PRIORITY_BADGES[selectedTask.priority]?.label || selectedTask.priority}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Due Date</p>
                <p className="text-sm">{selectedTask.dueAt ? new Date(selectedTask.dueAt).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assignee</p>
                <p className="text-sm">{selectedTask.assignee?.displayName || 'Unassigned'}</p>
              </div>
            </div>
            {/* Review Banner for Approval tasks */}
            {(selectedTask.reviewedParticipantName || selectedTask.participantName) && (
              <div className="mb-4 p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider block">
                    Đơn yêu cầu / Phiếu đánh giá của
                  </span>
                  <span className="text-sm font-bold text-blue-950">
                    {selectedTask.reviewedParticipantName || selectedTask.participantName}
                  </span>
                </div>
                {(selectedTask.reviewedParticipantId || selectedTask.participantId) && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full font-mono">
                    ID: {selectedTask.reviewedParticipantId || selectedTask.participantId}
                  </span>
                )}
              </div>
            )}

            {/* Form Fields Display */}
            {!!selectedTask.formFields?.length ? (
              <div className="border-t pt-4 mt-4 space-y-3 max-h-[45vh] overflow-auto">
                <h3 className="text-sm font-bold text-gray-800">
                  {selectedTask.taskType === 'APPROVAL' || selectedTask.taskType === 'REVIEW'
                    ? 'Nội dung thông tin cần phê duyệt'
                    : 'Biểu mẫu xử lý'}
                </h3>
                {selectedTask.formFields.filter((field: any) => field.visible !== false).map((field: any) => {
                  const key = field.outputMapping || field.id;
                  const value = formData[key] ?? field.resolvedValue ?? (selectedTask.reviewedSubmission?.[key] || selectedTask.reviewedSubmission?.[field.id]) ?? '';
                  return <label key={field.id} className="block text-sm">
                    <span className="font-semibold text-gray-700">{field.label || field.id}{field.required && !field.readOnly ? ' *' : ''}</span>
                    {field.bindingError && <span className="mt-1 block rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">Không thể nạp dữ liệu: {field.bindingError}</span>}
                    {field.type === 'textarea' ? <textarea readOnly={field.readOnly} value={String(value)} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 read-only:bg-gray-100/70 read-only:text-gray-800" />
                      : field.type === 'select' ? <select disabled={field.readOnly} value={String(value)} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-100/70 disabled:text-gray-800"><option value="">Chọn…</option>{field.options?.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                      : field.type === 'checkbox' ? <input type="checkbox" disabled={field.readOnly} checked={Boolean(value)} onChange={e => setFormData({ ...formData, [key]: e.target.checked })} className="ml-3" />
                      : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} readOnly={field.readOnly} value={String(value)} min={field.validation?.min} max={field.validation?.max} onChange={e => setFormData({ ...formData, [key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} className="mt-1 w-full border rounded px-3 py-2 read-only:bg-gray-100/70 read-only:text-gray-800" />}
                  </label>;
                })}
              </div>
            ) : selectedTask.reviewedSubmission && Object.keys(selectedTask.reviewedSubmission).length > 0 ? (
              <div className="border-t pt-4 mt-4 space-y-2 max-h-[45vh] overflow-auto">
                <h3 className="text-sm font-bold text-gray-800">Nội dung thông tin cần phê duyệt</h3>
                <div className="bg-gray-50 border rounded-lg p-3 divide-y divide-gray-200">
                  {Object.entries(selectedTask.reviewedSubmission).map(([k, v]) => (
                    <div key={k} className="py-2 flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-600 font-mono">{k}</span>
                      <span className="font-bold text-gray-900">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showRejectForm && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <label className="block text-sm font-semibold text-red-900" htmlFor="rejection-reason">
                  Lý do từ chối <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="rejection-reason"
                  autoFocus
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  placeholder="Nhập lý do để người được phê duyệt biết và điều chỉnh..."
                  rows={3}
                  className="mt-2 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                <p className="mt-1 text-xs text-red-700">Lý do này sẽ được gửi trong thông báo đến người được phê duyệt.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button onClick={() => setSelectedTask(null)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50 font-medium">Đóng</button>
              {selectedTask.status === 'CLAIMED' && (selectedTask.allowedActions ?? []).includes('REJECT') && (
                showRejectForm ? (
                  <>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-50 font-medium"
                    >
                      Hủy từ chối
                    </button>
                    <button
                      disabled={!rejectionReason.trim()}
                      onClick={() => void handleReject(selectedTask.id, rejectionReason, true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded text-sm font-semibold"
                    >
                      Gửi từ chối
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => selectedTask.taskType === 'APPROVAL'
                      ? setShowRejectForm(true)
                      : void handleReject(selectedTask.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
                  >
                    Từ chối
                  </button>
                )
              )}
              {!showRejectForm && selectedTask.status === 'CLAIMED' && (selectedTask.allowedActions ?? []).includes('COMPLETE') && (
                <button
                  onClick={() => void handleComplete(selectedTask.id, formData)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-semibold"
                >
                  {['APPROVAL', 'REVIEW'].includes(selectedTask.taskType) ? 'Phê duyệt (Approve)' : 'Hoàn thành'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
