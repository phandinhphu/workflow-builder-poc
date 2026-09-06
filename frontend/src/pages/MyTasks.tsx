import { useState, useEffect } from 'react';
import { useMyTasksStore } from '../stores/myTasksStore';
import { Loader2, RefreshCw, Eye, Search } from 'lucide-react';
import AssignmentTaskModal from '../components/node/AssignmentTaskModal';

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  CLAIMED: { label: 'Claimed', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  NORMAL: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  HIGH: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export default function MyTasksPage() {
  const { tasks, total, loading, error, loadTasks, claimTask, completeTask, rejectTask } = useMyTasksStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const filteredTasks = (tasks as any[]).filter((task: any) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!task.title?.toLowerCase().includes(q)) return false;
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

  const handleComplete = async (taskId: string, data: Record<string, unknown> = {}) => {
    try {
      const result = await completeTask(taskId, data);
      if (result.success) { setToast({ message: 'Task completed', type: 'success' }); setSelectedTask(null); await loadTasks(); }
    } catch (cause) { setToast({ message: cause instanceof Error ? cause.message : 'Không thể hoàn thành task', type: 'error' }); }
    setTimeout(() => setToast(null), 3000);
  };

  const handleReject = async (taskId: string) => {
    try {
      const result = await rejectTask(taskId);
      if (result.success) { setToast({ message: 'Task rejected', type: 'success' }); setSelectedTask(null); await loadTasks(); }
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

      <div className="grid grid-cols-4 gap-4 mb-6">
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

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Task</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTasks.map((task: any, index: number) => {
              const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'COMPLETED';
              return (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{task.taskType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_BADGES[task.priority]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITY_BADGES[task.priority]?.label || task.priority || 'Normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {task.dueAt ? (
                      <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {new Date(task.dueAt).toLocaleDateString()}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No due date</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGES[task.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_BADGES[task.status]?.label || task.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openTask(task)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => handleClaim(task.id)}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Claim
                        </button>
                      )}
                      {task.status === 'CLAIMED' && (
                        <>
                          <button
                            onClick={() => handleComplete(task.id, {})}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleReject(task.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Reject
                          </button>
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
            <p>No tasks found</p>
          </div>
        )}
      </div>

      {selectedTask && (selectedTask.taskType === 'ASSIGNMENT' ? (
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
            {!!selectedTask.formFields?.length && (
              <div className="border-t pt-4 mt-4 space-y-3 max-h-[45vh] overflow-auto">
                <h3 className="text-sm font-semibold">Biểu mẫu xử lý</h3>
                {selectedTask.formFields.filter((field: any) => field.visible !== false).map((field: any) => {
                  const key = field.outputMapping || field.id;
                  const value = formData[key] ?? '';
                  return <label key={field.id} className="block text-sm">
                    <span className="font-medium text-gray-700">{field.label}{field.required && !field.readOnly ? ' *' : ''}</span>
                    {field.bindingError && <span className="mt-1 block rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">Không thể nạp dữ liệu: {field.bindingError}</span>}
                    {field.type === 'textarea' ? <textarea readOnly={field.readOnly} value={String(value)} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 read-only:bg-gray-50" />
                      : field.type === 'select' ? <select disabled={field.readOnly} value={String(value)} onChange={e => setFormData({ ...formData, [key]: e.target.value })} className="mt-1 w-full border rounded px-3 py-2 disabled:bg-gray-50"><option value="">Chọn…</option>{field.options?.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                      : field.type === 'checkbox' ? <input type="checkbox" disabled={field.readOnly} checked={Boolean(value)} onChange={e => setFormData({ ...formData, [key]: e.target.checked })} className="ml-3" />
                      : <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} readOnly={field.readOnly} value={String(value)} min={field.validation?.min} max={field.validation?.max} onChange={e => setFormData({ ...formData, [key]: field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })} className="mt-1 w-full border rounded px-3 py-2 read-only:bg-gray-50" />}
                  </label>;
                })}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedTask(null)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Close</button>
              {selectedTask.status === 'PENDING' && <button onClick={async () => { await handleClaim(selectedTask.id); setSelectedTask(null); }} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Claim</button>}
              {selectedTask.status === 'CLAIMED' && <>
                <button onClick={() => void handleReject(selectedTask.id)} className="px-4 py-2 bg-red-600 text-white rounded text-sm">Reject</button>
                <button onClick={() => void handleComplete(selectedTask.id, formData)} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Complete</button>
              </>}
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
