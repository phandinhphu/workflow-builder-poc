/**
 * Notification Store
 * Zustand store for in-app notifications with 30s polling.
 */

import { create } from 'zustand';
import { api } from '../api/client';

export interface AppNotification {
  id: string;
  instanceId?: string;
  taskId?: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  readAt?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  /** Polling interval handle */
  _pollHandle: ReturnType<typeof setInterval> | null;

  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  /** Start 30-second polling. Call once after user is authenticated. */
  startPolling: () => void;
  /** Stop polling. Call on logout. */
  stopPolling: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  _pollHandle: null,

  loadNotifications: async () => {
    set({ loading: true });
    try {
      const raw = await api.notifications.list();
      const notifications: AppNotification[] = (raw as any[]).map((n) => ({
        id: String(n.id ?? ''),
        instanceId: n.instanceId ? String(n.instanceId) : undefined,
        taskId: n.taskId ? String(n.taskId) : undefined,
        channel: String(n.channel ?? 'inapp'),
        title: String(n.title ?? ''),
        body: String(n.body ?? ''),
        status: String(n.status ?? 'SENT'),
        createdAt: String(n.createdAt ?? ''),
        sentAt: n.sentAt ? String(n.sentAt) : undefined,
        readAt: n.readAt ? String(n.readAt) : undefined,
      }));
      const unreadCount = notifications.filter((n) => !n.readAt).length;
      set({ notifications, unreadCount, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.notifications.read(id);
      set((state) => {
        const notifications = state.notifications.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        );
        return { notifications, unreadCount: notifications.filter((n) => !n.readAt).length };
      });
    } catch {
      // Silently fail — UI still updates optimistically above
    }
  },

  markAllAsRead: async () => {
    const { notifications, markAsRead } = get();
    const unread = notifications.filter((n) => !n.readAt);
    await Promise.allSettled(unread.map((n) => markAsRead(n.id)));
  },

  startPolling: () => {
    const { _pollHandle, loadNotifications } = get();
    if (_pollHandle) return; // Already polling
    void loadNotifications();
    const handle = setInterval(() => void loadNotifications(), 30_000);
    set({ _pollHandle: handle });
  },

  stopPolling: () => {
    const { _pollHandle } = get();
    if (_pollHandle) {
      clearInterval(_pollHandle);
      set({ _pollHandle: null });
    }
  },
}));
