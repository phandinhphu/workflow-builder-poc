import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNotificationStore, type AppNotification } from '../stores/notificationStore';

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} ngày trước`;
}

interface NotificationItemProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onNavigate: (instanceId?: string) => void;
}

function NotificationItem({ notification, onRead, onNavigate }: NotificationItemProps) {
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) onRead(notification.id);
    if (notification.instanceId) onNavigate(notification.instanceId);
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 ${
        isUnread ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
      }`}
    >
      {/* Unread indicator */}
      <div className="mt-1 flex-shrink-0">
        {isUnread ? (
          <span className="block w-2 h-2 rounded-full bg-primary" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug truncate ${isUnread ? 'font-semibold text-navy' : 'font-medium text-gray-700'}`}>
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {notification.body}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Mark as read button (visible on hover for unread) */}
      {isUnread && (
        <button
          onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-blue-200"
          title="Đánh dấu đã đọc"
        >
          <CheckIcon className="w-3.5 h-3.5 text-primary" />
        </button>
      )}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotificationStore();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleNavigate = (instanceId?: string) => {
    if (instanceId) {
      navigate(`/workflows/-/instances/${instanceId}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[380px] z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0">
        <div className="flex items-center gap-2">
          <BellIcon className="w-4 h-4 text-navy" />
          <span className="text-sm font-semibold text-navy">Thông báo</span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllAsRead()}
              className="text-xs text-primary hover:underline font-medium"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto max-h-[420px]">
        {loading && notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Đang tải thông báo…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
            <BellIcon className="w-8 h-8 opacity-30" />
            <p className="text-sm">Không có thông báo nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onRead={markAsRead}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-center">
          <span className="text-xs text-gray-400">
            {notifications.length} thông báo · Tự động làm mới mỗi 30 giây
          </span>
        </div>
      )}
    </div>
  );
}
