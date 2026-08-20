import { Link } from 'react-router-dom';
import { DocumentTextIcon, CheckCircleIcon, PlayIcon, UsersIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { workflows, instances, orgUsers } from '../data/mockData';

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

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: string | number; sub: string; accent: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-navy mt-2">{value}</p>
          <p className="text-xs text-muted mt-1">{sub}</p>
        </div>
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', accent)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const publishedCount = workflows.filter(w => w.status === 'PUBLISHED').length;
  const runningCount = instances.filter(i => i.status === 'PENDING' || i.status === 'RUNNING').length;
  const activeUsers = orgUsers.filter(u => u.status === 'Active').length;
  const overdueCount = instances.filter(i => i.slaStatus === 'OVERDUE').length;

  const statusCounts = [
    { label: 'Published', value: publishedCount, color: 'bg-green-500' },
    { label: 'Suspended', value: workflows.filter(w => w.status === 'SUSPENDED').length, color: 'bg-orange-500' },
    { label: 'Draft', value: workflows.filter(w => w.status === 'DRAFT').length, color: 'bg-gray-400' },
  ];

  const instanceStatusCounts = [
    { label: 'Completed', value: instances.filter(i => i.status === 'COMPLETED').length, color: 'bg-green-500' },
    { label: 'Pending', value: instances.filter(i => i.status === 'PENDING').length, color: 'bg-orange-500' },
    { label: 'Rejected', value: instances.filter(i => i.status === 'REJECTED').length, color: 'bg-red-500' },
    { label: 'Cancelled', value: instances.filter(i => i.status === 'CANCELLED').length, color: 'bg-gray-400' },
  ];

  const recentInstances = [...instances].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5);
  const recentWorkflows = [...workflows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-auto">
      <div>
        <h1 className="text-xl font-bold text-navy">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Tổng quan hoạt động Workflow Builder.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={DocumentTextIcon} label="Tổng workflow" value={workflows.length} sub={`${publishedCount} đang hoạt động`} accent="bg-primary/10 text-primary" />
        <StatCard icon={PlayIcon} label="Instance đang chạy" value={runningCount} sub={`${overdueCount} quá hạn SLA`} accent="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircleIcon} label="Instance hoàn thành" value={instances.filter(i => i.status === 'COMPLETED').length} sub="Tổng trong tháng này" accent="bg-green-50 text-green-600" />
        <StatCard icon={UsersIcon} label="Nhân viên Active" value={activeUsers} sub={`${orgUsers.length} tổng trong directory`} accent="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-navy mb-4">Phân bố trạng thái workflow</h2>
          <div className="space-y-3">
            {statusCounts.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-600">{s.label}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full', s.color)} style={{ width: `${workflows.length ? (s.value / workflows.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-navy">{s.value}</span>
              </div>
            ))}
          </div>

          <h2 className="text-base font-bold text-navy mt-8 mb-4">Phân bố trạng thái instance</h2>
          <div className="space-y-3">
            {instanceStatusCounts.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-24 text-sm text-gray-600">{s.label}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full', s.color)} style={{ width: `${instances.length ? (s.value / instances.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-navy">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-navy">Instance gần đây</h2>
              <Link to="/workflows" className="text-sm font-medium text-primary hover:text-primary-dark">Xem tất cả</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {recentInstances.map(inst => (
                    <tr key={inst.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-5">
                        <Link to={`/workflows/${inst.workflowId}/instances/${inst.id}`} className="font-medium text-primary hover:underline">{inst.requestCode}</Link>
                        <p className="text-xs text-muted mt-0.5">{inst.workflowName}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{inst.creatorName}</td>
                      <td className="py-3 px-4">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[inst.status])}>
                          {STATUS_LABELS[inst.status] || inst.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {inst.slaStatus === 'OVERDUE' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Overdue
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">On-time</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex-1">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-bold text-navy">Workflow cập nhật gần đây</h2>
              <Link to="/workflows" className="text-sm font-medium text-primary hover:text-primary-dark">Xem tất cả</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {recentWorkflows.map(wf => (
                    <tr key={wf.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-5">
                        <Link to={`/workflows/${wf.id}`} className="font-medium text-navy hover:text-primary">{wf.name}</Link>
                        <p className="text-xs text-muted mt-0.5">v{wf.draftVersion} · {wf.module}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          wf.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : wf.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        )}>
                          {wf.status === 'PUBLISHED' ? 'Published' : wf.status === 'SUSPENDED' ? 'Suspended' : 'Draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{wf.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted">
          <ArrowPathIcon className="w-4 h-4" />
          Nguồn dữ liệu: HRM nội bộ — người dùng, cấp quản lý, đơn vị tổ chức và vai trò hệ thống được quản lý trực tiếp.
        </div>
      </div>
    </div>
  );
}
