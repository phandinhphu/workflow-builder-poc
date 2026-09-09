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
}

interface AuthState {
  currentUser: CurrentUser | null;
  loading: boolean;

  /** Fetch current user profile from /auth/me and store it. */
  loadCurrentUser: () => Promise<void>;

  /** Call logout API, clear token from localStorage, reset store. */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      loading: false,

      loadCurrentUser: async () => {
        set({ loading: true });
        try {
          const profile = await api.auth.me();
          set({
            currentUser: {
              id: String(profile['id'] ?? ''),
              username: String(profile['username'] ?? ''),
              displayName: String(profile['displayName'] ?? ''),
              email: profile['email'] ? String(profile['email']) : undefined,
              jobTitle: profile['jobTitle'] ? String(profile['jobTitle']) : undefined,
              organizationName: profile['organizationName'] ? String(profile['organizationName']) : undefined,
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
    }),
    {
      name: 'workflow-builder-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
