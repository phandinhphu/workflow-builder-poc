import { useState } from 'react';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';
import { useNotificationStore } from '../stores/notificationStore';
import NotificationDropdown from './NotificationDropdown';

export default function Topbar() {
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Create breadcrumbs based on route
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [];

    if (path.startsWith('/users')) crumbs.push('Người dùng');
    else if (path.startsWith('/workflows')) {
      crumbs.push('Danh sách Workflow');
      if (path.includes('/designer')) crumbs.push('Thiết kế Workflow');
      else if (path.includes('/history')) crumbs.push('Audit & History');
      else if (path.includes('/runtime')) crumbs.push('Theo dõi Runtime');
      else if (path.includes('/instances/')) crumbs.push('Chi tiết Instance');
    } else if (path.startsWith('/sync')) crumbs.push('Cơ cấu tổ chức');
    else if (path.startsWith('/settings')) crumbs.push('Vai trò hệ thống');
    else if (path.startsWith('/catalog')) crumbs.push('Cổng Dịch vụ');
    else if (path.startsWith('/my-tasks')) crumbs.push('Nhiệm vụ của tôi');
    else if (path.startsWith('/connectors')) crumbs.push('Kết nối & API');
    else crumbs.push('Dashboard');

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-[68px] flex items-center justify-between px-6 bg-surface border-b border-border shadow-sm">
      <div className="flex items-center text-sm font-medium text-gray-500 flex-1">
        {breadcrumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center">
            {idx > 0 && <span className="mx-2 text-gray-400">/</span>}
            <span className={idx === breadcrumbs.length - 1 ? 'text-navy font-semibold' : ''}>
              {crumb}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {/* Global search */}
        <div className="relative hidden md:block">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm workflow, người dùng..."
            className="pl-9 pr-4 py-2 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
          />
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative text-gray-400 hover:text-navy transition-colors p-1 rounded-md ${notifOpen ? 'text-navy bg-gray-100' : ''}`}
            aria-label="Thông báo"
          >
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          <NotificationDropdown
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
