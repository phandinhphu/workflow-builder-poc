import type { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAdmin,
}: ProtectedRouteProps) {
  const { currentUser, hasPermission, hasAnyPermission, hasRole, isAdmin } = useAuthStore();

  if (!currentUser) {
    return <Navigate to="/catalog" replace />;
  }

  // System admin has access to everything
  if (isAdmin()) {
    return <>{children}</>;
  }

  if (requireAdmin && !isAdmin()) {
    return <AccessDenied reason="Yêu cầu quyền Quản trị viên hệ thống (SYSTEM_ADMIN)" />;
  }

  if (permission && !hasPermission(permission)) {
    return <AccessDenied reason={`Yêu cầu quyền: ${permission}`} />;
  }

  if (permissions && permissions.length > 0 && !hasAnyPermission(permissions)) {
    return <AccessDenied reason={`Yêu cầu một trong các quyền: ${permissions.join(', ')}`} />;
  }

  if (role && !hasRole(role)) {
    return <AccessDenied reason={`Yêu cầu vai trò: ${role}`} />;
  }

  if (roles && roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return <AccessDenied reason={`Yêu cầu một trong các vai trò: ${roles.join(', ')}`} />;
  }

  return <>{children}</>;
}

function AccessDenied({ reason }: { reason: string }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">403 - Không có quyền truy cập</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tài khoản của bạn không có đủ quyền hạn để xem hoặc thao tác trên trang này.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 font-mono mb-6 text-left border border-gray-100">
          {reason}
        </div>
        <div className="flex gap-3 justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Về Cổng dịch vụ
          </Link>
          <Link
            to="/my-tasks"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nhiệm vụ của tôi
          </Link>
        </div>
      </div>
    </div>
  );
}
