/**
 * Credential Store
 * Zustand store for credential management
 * Section 7.9 - Secure credential storage and reference
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CredentialDefinition } from '../types/credential';
import { api } from '../api/client';

interface CredentialState {
  credentials: CredentialDefinition[];
  loading: boolean;
  error?: string;

  loadCredentials: () => Promise<void>;
  getCredential: (id: string) => CredentialDefinition | undefined;
  createCredential: (credential: Omit<CredentialDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCredential: (id: string, credential: Partial<CredentialDefinition>) => void;
  deleteCredential: (id: string) => void;
  testCredential: (id: string) => Promise<{ success: boolean; message: string }>;
  refreshCredentials: () => Promise<void>;
}

export const useCredentialStore = create<CredentialState>()(
  persist(
    (set, get) => ({
      credentials: [],
      loading: false,
      error: undefined,

      loadCredentials: async () => {
        set({ loading: true });
        try {
          const items = await api.credentials.list();
          const mapped = items.map(item => ({ ...item, type: item.credentialType, scope: item.organizationScopeId ? 'WORKFLOW' : 'GLOBAL', encryptedData: item.secretReference }));
          set({ credentials: mapped as CredentialDefinition[], loading: false, error: undefined });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load credentials', loading: false });
        }
      },

      getCredential: (id: string) => {
        return get().credentials.find(c => c.id === id);
      },

      createCredential: (credential) => {
        const id = `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newCredential = {
          ...credential,
          id,
          type: credential.type || 'API_KEY',
          metadata: credential.metadata || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as CredentialDefinition;
        set(state => ({
          credentials: [...state.credentials, newCredential],
        }));
        return id;
      },

      updateCredential: (id, credential) => {
        set(state => ({
          credentials: state.credentials.map(c =>
            c.id === id ? { ...c, ...credential, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      deleteCredential: (id) => {
        set(state => ({
          credentials: state.credentials.filter(c => c.id !== id),
        }));
      },

      testCredential: async (id) => {
        const credential = get().credentials.find(c => c.id === id);
        if (!credential) {
          return { success: false, message: 'Credential not found' };
        }

        return { success: false, message: 'Credential reference chỉ được kiểm tra khi gọi connector; secret không được đưa về trình duyệt.' };
      },

      refreshCredentials: async () => {
        set({ loading: true });
        await get().loadCredentials();
        set({ loading: false });
      },
    }),
    {
      name: 'workflow-builder-credential-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
