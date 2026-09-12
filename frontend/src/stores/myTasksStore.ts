/**
 * My Tasks Store
 * Zustand store for my tasks management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TaskDefinition, MyTasksFilter } from '../types/task';
import { api } from '../api/client';

interface MyTasksState {
  tasks: TaskDefinition[];
  total: number;
  page: number;
  pageSize: number;
  filters: MyTasksFilter;
  loading: boolean;
  error?: string;

  loadTasks: (filters?: MyTasksFilter) => Promise<void>;
  getTask: (taskId: string) => TaskDefinition | undefined;
  claimTask: (taskId: string) => Promise<{ success: boolean; message: string }>;
  completeTask: (taskId: string, data?: Record<string, unknown>, comment?: string) => Promise<{ success: boolean; message: string }>;
  rejectTask: (taskId: string, comment?: string) => Promise<{ success: boolean; message: string }>;
}

export const useMyTasksStore = create<MyTasksState>()(
  persist(
    (set, get) => ({
      tasks: [],
      total: 0,
      page: 1,
      pageSize: 10,
      filters: {},
      loading: false,
      error: undefined,

      loadTasks: async (filters?: MyTasksFilter) => {
        set({ loading: true, filters: filters || get().filters });
        try {
          const result = await api.runtime.tasks();
          set({ tasks: result as unknown as TaskDefinition[], total: result.length, loading: false, error: undefined });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load tasks', loading: false });
        }
      },

      getTask: (taskId) => {
        return get().tasks.find(t => t.id === taskId);
      },

      claimTask: async (taskId) => {
        return api.runtime.claim(taskId);
      },

      completeTask: async (taskId, data = {}, comment) => {
        return api.runtime.complete(taskId, data, comment);
      },

      rejectTask: async (taskId, comment) => {
        return api.runtime.reject(taskId, comment);
      },
    }),
    {
      name: 'workflow-builder-my-tasks-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
