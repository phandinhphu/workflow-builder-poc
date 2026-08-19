import { useState } from 'react';
import { Cog6ToothIcon, LinkIcon, TrashIcon, PlusIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import Toast, { useToasts } from '../components/Toast';
import { connectors, type ConnectorDefinition } from '../data/mockData';

export default function SettingsPage() {
  const [list, setList] = useState<ConnectorDefinition[]>(connectors);
  const toasts = useToasts();

  const toggle = (conn: ConnectorDefinition) => {
    const next = conn.status === 'CONNECTED' ? 'DISABLED' : 'CONNECTED';
    setList(list.map(c => (c.id === conn.id ? { ...c, status: next } : c)));
    if (next === 'DISABLED') {
      toasts.pushToast('warning', `Connector "${conn.name}" đã bị vô hiệu hóa. Workflow dùng connector này sẽ bị chặn publish hoặc cảnh báo.`);
    } else {
      toasts.pushToast('success', `Connector "${conn.name}" đã kích hoạt lại.`);
    }
  };

  const addConnector = () => {
    toasts.pushToast('info', 'Tạo connector mới: sẽ mở modal nhập tên, loại, base URL và auth (mô phỏng).');
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 overflow-auto">
      <div>
        <h1 className="text-xl font-bold text-navy">Cài đặt</h1>
        <p className="text-sm text-muted mt-1">Quản lý connector/integration dùng cho trigger webhook và System Action.</p>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex-1">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-navy">Connector Registry</h2>
            <p className="text-xs text-muted mt-0.5">Connector bị disable → chặn publish hoặc warning theo policy (§16).</p>
          </div>
          <button
            onClick={addConnector}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> Tạo connector
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Connector</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Loại</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Base URL</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Xác thực</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Kiểm tra gần nhất</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {list.map(conn => (
                <tr key={conn.id} className="border-b border-border last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-8 h-8 rounded flex items-center justify-center', conn.status === 'CONNECTED' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400')}>
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-navy">{conn.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{conn.type}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{conn.baseUrl}</td>
                  <td className="px-4 py-3 text-gray-600">{conn.auth}</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      conn.status === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {conn.status === 'CONNECTED' ? (
                        <><ShieldCheckIcon className="w-3 h-3" /> Connected</>
                      ) : (
                        <><ExclamationTriangleIcon className="w-3 h-3" /> Disabled</>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{conn.lastChecked}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggle(conn)}
                      className={clsx(
                        'text-sm font-medium mr-3',
                        conn.status === 'CONNECTED' ? 'text-warning hover:text-orange-700' : 'text-primary hover:text-primary-dark'
                      )}
                    >
                      {conn.status === 'CONNECTED' ? 'Vô hiệu hóa' : 'Kích hoạt'}
                    </button>
                    <button
                      onClick={() => toasts.pushToast('info', `Connector "${conn.name}": xóa chỉ khi không workflow nào đang tham chiếu (mô phỏng).`)}
                      className="text-danger hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-border bg-gray-50 flex items-center gap-2 text-xs text-muted">
          <Cog6ToothIcon className="w-4 h-4" />
          Credentials được lưu dưới dạng reference (không hiển thị secret) và được cấp quyền theo Admin.
        </div>
      </div>

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}