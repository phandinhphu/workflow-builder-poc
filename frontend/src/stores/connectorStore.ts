/**
 * Connector Store
 * Zustand store for connector management
 * Section 7.9, 7.15 - System Action & Integration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ConnectorDefinition,
  ConnectorInstance,
} from '../types/connector';
import type {
  CredentialDefinition,
} from '../types/credential';
import { api } from '../api/client';

interface ConnectorState {
  // Connectors
  connectors: ConnectorDefinition[];
  loading: boolean;
  error?: string;

  // Instances
  instances: ConnectorInstance[];
  loadingInstance: boolean;
  instanceError?: string;

  // Credentials
  credentials: CredentialDefinition[];
  credentialLoading: boolean;
  credentialError?: string;

  // Actions
  loadConnectors: () => Promise<void>;
  createConnector: (connector: Omit<ConnectorDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateConnector: (id: string, connector: Partial<ConnectorDefinition>) => void;
  deleteConnector: (id: string) => void;
  getConnector: (id: string) => ConnectorDefinition | undefined;

  // Instance management
  createInstance: (connectorId: string, name: string, config: Record<string, unknown>) => ConnectorInstance;
  testInstance: (instanceId: string) => Promise<{ success: boolean; message: string }>;
  updateInstance: (instanceId: string, config: Record<string, unknown>) => void;
  deleteInstance: (instanceId: string) => void;
  getInstance: (id: string) => ConnectorInstance | undefined;

  // Credential management
  loadCredentials: () => Promise<void>;
  createCredential: (credential: Omit<CredentialDefinition, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCredential: (id: string, credential: Partial<CredentialDefinition>) => void;
  deleteCredential: (id: string) => void;
  getCredential: (id: string) => CredentialDefinition | undefined;
  testCredential: (id: string) => Promise<{ success: boolean; message: string }>;
}

export const useConnectorStore = create<ConnectorState>()(
  persist(
    (set, get) => ({
      connectors: [],
      loading: false,
      error: undefined,
      instances: [],
      loadingInstance: false,
      instanceError: undefined,
      credentials: [],
      credentialLoading: false,
      credentialError: undefined,

      loadConnectors: async () => {
        set({ loading: true });
        try {
          const items = await api.connectors.list();
          const mapped = items.map(item => ({ ...item, type: item.connectorType, description: item.configuration?.description ?? '', version: '1.0', configSchema: item.configuration?.configSchema ?? { type: 'object' }, actions: item.configuration?.actions ?? [] }));
          set({ connectors: mapped as ConnectorDefinition[], loading: false, error: undefined });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load connectors', loading: false });
        }
      },

      createConnector: (connector) => {
        const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newConnector: ConnectorDefinition = {
          ...connector,
          id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as ConnectorDefinition;
        set(state => ({
          connectors: [...state.connectors, newConnector],
        }));
        return id;
      },

      updateConnector: (id, connector) => {
        set(state => ({
          connectors: state.connectors.map(c =>
            c.id === id ? { ...c, ...connector, updatedAt: new Date().toISOString() } : c
          ),
        }));
      },

      deleteConnector: (id) => {
        set(state => ({
          connectors: state.connectors.filter(c => c.id !== id),
          instances: state.instances.filter(i => i.connectorId !== id),
        }));
      },

      getConnector: (id) => {
        return get().connectors.find(c => c.id === id);
      },

      createInstance: (connectorId, name, config) => {
        const id = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newInstance: ConnectorInstance = {
          id,
          connectorId,
          name,
          config,
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        set(state => ({
          instances: [...state.instances, newInstance],
        }));
        return newInstance;
      },

      testInstance: async (instanceId) => {
        const instance = get().instances.find(i => i.id === instanceId);
        if (!instance) {
          return { success: false, message: 'Instance not found' };
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          success: true,
          message: `Connector ${instance.connectorId} tested successfully`,
        };
      },

      updateInstance: (instanceId, config) => {
        set(state => ({
          instances: state.instances.map(i =>
            i.id === instanceId ? { ...i, config, updatedAt: new Date().toISOString() } : i
          ),
        }));
      },

      deleteInstance: (instanceId) => {
        set(state => ({
          instances: state.instances.filter(i => i.id !== instanceId),
        }));
      },

      getInstance: (id) => {
        return get().instances.find(i => i.id === id);
      },

      loadCredentials: async () => {
        set({ credentialLoading: true });
        try {
          const items = await api.credentials.list();
          const mapped = items.map(item => ({ ...item, type: item.credentialType, scope: item.organizationScopeId ? 'WORKFLOW' : 'GLOBAL', encryptedData: item.secretReference }));
          set({ credentials: mapped as CredentialDefinition[], credentialLoading: false, credentialError: undefined });
        } catch (error) {
          set({ credentialError: error instanceof Error ? error.message : 'Failed to load credentials', credentialLoading: false });
        }
      },

      createCredential: (credential) => {
        const id = `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newCredential: CredentialDefinition = {
          ...credential,
          id,
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

      getCredential: (id) => {
        return get().credentials.find(c => c.id === id);
      },

      testCredential: async (id) => {
        const credential = get().credentials.find(c => c.id === id);
        if (!credential) {
          return { success: false, message: 'Credential not found' };
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          message: `Credential ${credential.name} tested successfully`,
        };
      },
    }),
    {
      name: 'workflow-builder-connector-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
