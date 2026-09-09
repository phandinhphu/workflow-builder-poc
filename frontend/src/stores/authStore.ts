/**
 * Auth Store
 * Zustand store for current user session and authentication state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from '../api/client';

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  organizationName?: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  currentUser: CurrentUser | null;
  loading: boolean;

  /** Fetch current user profile from /auth/me and store it. */
  loadCurrentUser: () => Promise<void>;

  /** Call logout API, clear token from localStorage, reset store. */
  logout: () => Promise<void>;

  /** Check if current user has a specific permission. */
  hasPermission: (permission: string) => boolean;

  /** Check if current user has any of the given permissions. */
  hasAnyPermission: (permissions: string[]) => boolean;

  /** Check if current user has a specific role (e.g. 'SYSTEM_ADMIN'). */
  hasRole: (role: string) => boolean;

  /** Check if current user is system admin. */
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      loading: false,

      loadCurrentUser: async () => {
        set({ loading: true });
        try {
          const profile = await api.auth.me();
          const roles = Array.isArray(profile['roles']) ? (profile['roles'] as string[]) : [];
          const permissions = Array.isArray(profile['permissions']) ? (profile['permissions'] as string[]) : [];

          set({
            currentUser: {
              id: String(profile['id'] ?? ''),
              username: String(profile['username'] ?? ''),
              displayName: String(profile['displayName'] ?? ''),
              email: profile['email'] ? String(profile['email']) : undefined,
              jobTitle: profile['jobTitle'] ? String(profile['jobTitle']) : undefined,
              organizationName: profile['organizationName'] ? String(profile['organizationName']) : undefined,
              roles,
              permissions,
            },
            loading: false,
          });
        } catch {
          set({ loading: false });
          throw new Error('Không thể tải thông tin người dùng');
        }
      },

      logout: async () => {
        try {
          await api.auth.logout();
        } catch {
          // Ignore logout API errors — still clear local state
        }
        localStorage.removeItem('workflow.authToken');
        localStorage.removeItem('workflow.currentUserId');
        localStorage.removeItem('workflow.authExpiresAt');
        set({ currentUser: null });
      },

      hasPermission: (permission: string) => {
        const user = get().currentUser;
        if (!user) return false;
        if (user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('ROLE-ADMIN')) return true;
        return user.permissions.includes(permission);
      },

      hasAnyPermission: (permissions: string[]) => {
        const user = get().currentUser;
        if (!user) return false;
        if (user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('ROLE-ADMIN')) return true;
        return permissions.some((p) => user.permissions.includes(p));
      },

      hasRole: (role: string) => {
        const user = get().currentUser;
        if (!user) return false;
        return user.roles.includes(role);
      },

      isAdmin: () => {
        const user = get().currentUser;
        if (!user) return false;
        return user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('ROLE-ADMIN');
      },
    }),
    {
      name: 'workflow-builder-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
