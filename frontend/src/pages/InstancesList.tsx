import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MagnifyingGlassIcon, PlayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Pagination from '../components/Pagination';
import { getInstancesByWorkflow, getWorkflow } from '../data/mockData';

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

export default function InstancesList() {
  const { id } = useParams<{ id: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  const workflow = id ? getWorkflow(id) : undefined;
  const allInstances = getInstancesByWorkflow(id);

  const filtered = useMemo(() => {
    return allInstances.filter(inst => {
      const matchesSearch =
        inst.requestCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inst.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.currentStepLabels.join(' ').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || inst.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allInstances, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
          <Link to="/workflows" className="text-sm font-medium text-navy border border-border rounded px-4 py-2 hover:bg-gray-50">
            Quay lại
          </Link>
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
    </div>
  );
}