import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useLocation } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();
  
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
    } else if (path.startsWith('/sync')) crumbs.push('Đồng bộ dữ liệu');
    else if (path.startsWith('/settings')) crumbs.push('Cài đặt');
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
            <span className={idx === breadcrumbs.length - 1 ? "text-navy font-semibold" : ""}>
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
        
        <button className="text-gray-400 hover:text-navy relative">
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-danger rounded-full border border-white"></span>
        </button>
      </div>
    </div>
  );
}
