import { Link, useLocation } from 'react-router-dom';
import { Squares2X2Icon, UsersIcon, HomeIcon, DocumentTextIcon, BuildingOffice2Icon, ShieldCheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, LinkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { getCurrentUser } from '../data/mockData';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Người dùng', href: '/users', icon: UsersIcon },
  { name: 'Danh sách Workflow', href: '/workflows', icon: DocumentTextIcon },
  { name: 'Nhiệm vụ của tôi', href: '/my-tasks', icon: ClipboardDocumentCheckIcon },
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
  const currentUser = getCurrentUser();

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

      <div className="p-4 border-t border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-sm font-bold">
          {currentUser.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
          <p className="text-xs text-gray-400 truncate">{currentUser.role}</p>
        </div>
        <button className="text-gray-400 hover:text-white" aria-label="Menu tài khoản">
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
