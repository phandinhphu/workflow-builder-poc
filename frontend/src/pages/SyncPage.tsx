import { useState } from 'react';
import { ArrowPathIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Toast, { useToasts } from '../components/Toast';
import { syncLogs } from '../data/mockData';

export default function SyncPage() {
  const [mode, setMode] = useState<'Full' | 'Incremental'>('Incremental');
  const [isRunning, setIsRunning] = useState(false);
  const [lastSync, setLastSync] = useState('2024-12-10 08:30');
  const toasts = useToasts();

  const handleSync = () => {
    if (isRunning) return;
    setIsRunning(true);
    toasts.pushToast('info', `Đang đồng bộ ${mode === 'Full' ? 'toàn bộ' : 'incremental'} từ SAP SuccessFactors...`);
    setTimeout(() => {
      setIsRunning(false);
      const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
      setLastSync(now);
      toasts.pushToast('success', `Đồng bộ ${mode === 'Full' ? 'full' : 'incremental'} hoàn tất: 3 record upsert, 0 lỗi (mô phỏng).`);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-auto">
      <div>
        <h1 className="text-xl font-bold text-navy">Đồng bộ dữ liệu</h1>
        <p className="text-sm text-muted mt-1">Đồng bộ Organization Directory từ hệ thống nguồn đã cấu hình (§10.1).</p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <div>
              <p className="font-bold text-navy">SAP SuccessFactors</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircleIcon className="w-3 h-3" /> Đã kết nối
                </span>
                <span className="text-xs text-muted">Đồng bộ gần nhất: {lastSync}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={isRunning}
              className={clsx(
                'px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark flex items-center gap-2',
                isRunning && 'opacity-70 cursor-wait'
              )}
            >
              <ArrowPathIcon className={clsx('w-4 h-4', isRunning && 'animate-spin')} />
              {isRunning ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
            <button
              onClick={() => toasts.pushToast('info', 'Cấu hình kết nối: OAuth 2.0 — endpoint /api/odata/v2/User (mô phỏng).')}
              className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Cog6ToothIcon className="w-4 h-4" /> Cấu hình kết nối
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-xs font-bold text-navy uppercase mb-2">Chế độ đồng bộ</p>
          <div className="flex gap-4">
            {(['Incremental', 'Full'] as const).map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="syncMode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{m === 'Incremental' ? 'Incremental (chỉ bản ghi thay đổi)' : 'Full (toàn bộ directory)'}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted mt-3 leading-relaxed">
            Upsert theo external id ổn định. Không xóa cứng user khi nguồn tạm thời không trả về — chỉ chuyển Active/Inactive và ghi audit.
            Record thiếu manager vẫn được đồng bộ; resolver động có thể fallback tại runtime.
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-navy">Lịch sử đồng bộ</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Thời gian</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Chế độ</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Upsert</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Inactive</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Lỗi</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map(log => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{log.time}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', log.mode === 'Full' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600')}>
                      {log.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.recordsUpserted}</td>
                  <td className="px-4 py-3 text-gray-600">{log.recordsInactivated}</td>
                  <td className="px-4 py-3">
                    {log.errors > 0 ? <span className="text-red-600 font-medium">{log.errors}</span> : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'SUCCESS' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircleIcon className="w-3 h-3" /> Thành công
                      </span>
                    ) : log.status === 'RUNNING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <ArrowPathIcon className="w-3 h-3 animate-spin" /> Đang chạy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <ExclamationTriangleIcon className="w-3 h-3" /> Lỗi
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted max-w-md">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}