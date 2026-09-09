import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Squares2X2Icon, UsersIcon, HomeIcon, DocumentTextIcon,
  BuildingOffice2Icon, ShieldCheckIcon, ChevronDownIcon,
  ClipboardDocumentCheckIcon, LinkIcon, SparklesIcon,
  ArrowRightOnRectangleIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';

const navigation = [
  { name: 'Cổng Dịch vụ (Catalog)', href: '/catalog', icon: SparklesIcon },
  { name: 'Nhiệm vụ của tôi', href: '/my-tasks', icon: ClipboardDocumentCheckIcon },
  { name: 'Danh sách Workflow', href: '/workflows', icon: DocumentTextIcon },
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Người dùng', href: '/users', icon: UsersIcon },
  { name: 'Kết nối & API', href: '/connectors', icon: LinkIcon },
];

const bottomItems = [
  { name: 'Cơ cấu tổ chức', href: '/sync', icon: BuildingOffice2Icon },
  { name: 'Vai trò hệ thống', href: '/settings', icon: ShieldCheckIcon },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const location = useLocation();
  const { currentUser, logout } = useAuthStore();
  const { stopPolling } = useNotificationStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    stopPolling();
    await logout();
    // App.tsx will detect missing token and switch to LoginPage
    window.location.reload();
  };

  const initials = currentUser?.displayName
    ? currentUser.displayName.charAt(0).toUpperCase()
    : '?';

  return (
    <div className="flex w-[260px] flex-col border-r border-gray-800 bg-navy text-white">
      <div className="flex h-[68px] shrink-0 items-center px-6 border-b border-gray-800 gap-3">
        <div className="bg-primary rounded p-1">
          <Squares2X2Icon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold">Workflow Builder</h1>
      </div>

      <nav className="flex flex-1 flex-col px-4 py-4 overflow-y-auto">
        <ul role="list" className="flex flex-1 flex-col gap-y-1">
          {navigation.map((item) => {
            const isActive = isActivePath(location.pathname, item.href);
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={clsx(
                    isActive ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800',
                    'group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 pb-4 pt-4 border-t border-gray-800 flex flex-col gap-1">
        {bottomItems.map((item) => {
          const isActive = isActivePath(location.pathname, item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                isActive ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800',
                'group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* User section with logout dropdown */}
      <div className="relative p-4 border-t border-gray-800" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 rounded-md p-1 hover:bg-gray-800 transition-colors text-left"
          aria-label="Menu tài khoản"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {currentUser?.displayName ?? 'Đang tải…'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {currentUser?.jobTitle ?? currentUser?.organizationName ?? ''}
            </p>
          </div>
          <ChevronDownIcon
            className={clsx(
              'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200',
              menuOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-gray-700 flex items-center gap-2">
              <UserCircleIcon className="w-4 h-4 text-gray-400" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.displayName ?? '—'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {currentUser?.email ?? ''}
                </p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={() => void handleLogout()}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
