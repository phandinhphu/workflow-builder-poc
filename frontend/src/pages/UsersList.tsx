import { useState } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon, PlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Pagination from '../components/Pagination';
import Toast, { useToasts } from '../components/Toast';
import { orgUsers, userDisplayName } from '../data/mockData';

const PAGE_SIZE = 5;

export default function UsersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const toasts = useToasts();

  const filteredUsers = orgUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSync = () => {
    toasts.pushToast('success', 'Đã đồng bộ 8 nhân viên từ SAP SuccessFactors (mô phỏng).');
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">

        <div className="p-5 border-b border-border flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-navy">Đồng bộ người dùng</h2>
            <p className="text-sm text-muted mt-1">Đồng bộ danh sách nhân sự từ hệ thống đã có vào hệ thống Workflow Builder.</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                S
              </div>
              <span className="text-sm font-medium">SAP SuccessFactors</span>
              <span className="text-xs text-muted ml-2">2024-12-10 08:30</span>
            </div>
            <button onClick={handleSync} className="px-4 py-2 text-sm font-medium border border-border rounded-md bg-white hover:bg-gray-50 flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4" /> Đồng bộ
            </button>
            <button className="px-4 py-2 text-sm font-medium border border-border rounded-md bg-white hover:bg-gray-50">
              Cấu hình kết nối
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-border flex justify-between items-center">
          <h3 className="text-base font-bold text-navy">Danh sách người dùng</h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Thêm người dùng mới
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Họ tên</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Email</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Phòng ban</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Chức vụ</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Cấp quản lý</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((user, idx) => (
                <tr key={user.id} className={clsx('border-b border-border hover:bg-gray-50', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                  <td className="py-3 px-4 text-sm font-medium text-navy flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {user.displayName.charAt(0)}
                    </div>
                    {user.displayName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.department}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.role}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {user.managerId ? userDisplayName(user.managerId) : '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={clsx('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                      user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    )}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full mr-1.5', user.status === 'Active' ? 'bg-green-500' : 'bg-gray-400')}></span>
                      {user.status === 'Active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary hover:text-primary-dark text-sm font-medium">Phân quyền</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paged.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <UserPlusIcon className="w-8 h-8 mb-2 opacity-30" />
              <p>Không tìm thấy người dùng nào</p>
            </div>
          )}
        </div>

        <Pagination page={safePage} pageSize={PAGE_SIZE} total={filteredUsers.length} onChange={setPage} label="nhân viên" />
      </div>

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}