import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = (type: ToastMessage['type'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const dismissToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, pushToast, dismissToast };
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="status"
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-white text-sm max-w-sm',
            toast.type === 'success' && 'border-green-200',
            toast.type === 'error' && 'border-red-200',
            toast.type === 'warning' && 'border-orange-200',
            toast.type === 'info' && 'border-border'
          )}
        >
          {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-success shrink-0" />}
          {toast.type === 'error' && <XCircleIcon className="w-5 h-5 text-danger shrink-0" />}
          {toast.type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0" />}
          {toast.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-primary shrink-0" />}
          <span className="text-navy flex-1">{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-gray-400 hover:text-navy p-0.5"
            aria-label="Đóng thông báo"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}