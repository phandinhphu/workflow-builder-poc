import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Squares2X2Icon, UsersIcon, ChevronDownIcon, HomeIcon, DocumentTextIcon, ArrowPathIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { getCurrentUser } from '../data/mockData';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Người dùng', href: '/users', icon: UsersIcon },
  { 
    name: 'Danh sách Workflow', 
    href: '/workflows', 
    icon: DocumentTextIcon,
    children: [
      { name: 'Workflows', href: '/workflows' },
    ]
  },
];

const bottomItems = [
  { name: 'Đồng bộ dữ liệu', href: '/sync', icon: ArrowPathIcon },
  { name: 'Cài đặt', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Danh sách Workflow': true
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex w-[260px] flex-col border-r border-gray-800 bg-navy text-white">
      <div className="flex h-[68px] shrink-0 items-center px-6 border-b border-gray-800 gap-3">
        <div className="bg-primary rounded p-1">
          <Squares2X2Icon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-bold">Workflow Builder</h1>
      </div>
      <nav className="flex flex-1 flex-col px-4 py-4 overflow-y-auto">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={clsx(
                      'w-full flex items-center justify-between gap-x-3 rounded-md p-2 text-sm leading-6 font-medium text-gray-300 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    <div className="flex items-center gap-x-3">
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {item.name}
                    </div>
                    <ChevronDownIcon className={clsx("w-4 h-4 transition-transform", openMenus[item.name] ? "rotate-180" : "")} />
                  </button>
                  {openMenus[item.name] && (
                    <ul className="mt-1 flex flex-col gap-y-1 pl-8">
                      {item.children.map(child => {
                        const isActive = location.pathname === child.href || (location.pathname.startsWith(child.href) && child.href !== '/');
                        return (
                          <li key={child.name}>
                            <Link
                              to={child.href}
                              className={clsx(
                                isActive ? 'text-white font-semibold' : 'text-gray-400 hover:text-white',
                                'block rounded-md p-2 text-sm leading-6 relative'
                              )}
                            >
                              {isActive && <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />}
                              {child.name}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  to={item.href}
                  className={clsx(
                    location.pathname === item.href || (location.pathname.startsWith(item.href) && item.href !== '/')
                      ? 'bg-primary text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800',
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
                  )}
                >
                  <item.icon
                    className="h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Bottom navigation items */}
      <div className="px-4 pb-4 border-t border-gray-800 flex flex-col gap-1">
        {bottomItems.map(item => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                isActive ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800',
                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-medium'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* User profile at bottom of sidebar based on design */}
      <div className="p-4 border-t border-gray-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-sm font-bold">
          {getCurrentUser().name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{getCurrentUser().name}</p>
          <p className="text-xs text-gray-400 truncate">{getCurrentUser().role}</p>
        </div>
        <button className="text-gray-400 hover:text-white">
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
