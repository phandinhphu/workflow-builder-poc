import type { ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface CanProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

export default function Can({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAdmin,
  fallback = null,
}: CanProps) {
  const { currentUser, hasPermission, hasAnyPermission, hasRole, isAdmin } = useAuthStore();

  if (!currentUser) return <>{fallback}</>;

  if (isAdmin()) return <>{children}</>;

  if (requireAdmin && !isAdmin()) return <>{fallback}</>;

  if (permission && !hasPermission(permission)) return <>{fallback}</>;

  if (permissions && permissions.length > 0 && !hasAnyPermission(permissions)) return <>{fallback}</>;

  if (role && !hasRole(role)) return <>{fallback}</>;

  if (roles && roles.length > 0 && !roles.some((r) => hasRole(r))) return <>{fallback}</>;

  return <>{children}</>;
}
