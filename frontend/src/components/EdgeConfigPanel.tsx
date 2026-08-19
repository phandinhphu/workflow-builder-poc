import { useState } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Edge } from '@xyflow/react';
import ConditionBuilderModal from './ConditionBuilderModal';
import clsx from 'clsx';

interface EdgeConfigPanelProps {
  edge: Edge;
  onClose: () => void;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

export default function EdgeConfigPanel({ edge, onClose, onUpdate, onDelete }: EdgeConfigPanelProps) {
  const [isConditionOpen, setIsConditionOpen] = useState(false);

  const sourceHandle = edge.sourceHandle;
  const isConditionPath = sourceHandle === 'true' || sourceHandle === 'false';
  const pathLabel = sourceHandle === 'true' ? 'TRUE' : sourceHandle === 'false' ? 'FALSE' : '';

  const condition: string = (edge.data?.condition as string) || '';
  const isDefault: boolean = edge.data?.isDefault === true;

  return (
    <div className="w-[360px] border-l border-border bg-white flex flex-col h-full z-20 shadow-xl shrink-0 absolute right-0 top-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
        <div>
          <h2 className="text-sm font-bold text-navy leading-none mb-1">Cấu hình đường đi</h2>
          <p className="text-[10px] text-muted">
            {isConditionPath ? `Nhánh ${pathLabel} của bước điều kiện` : 'Đường kết nối giữa hai bước'}
          </p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-navy hover:bg-gray-200 rounded transition-colors" aria-label="Đóng">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {isConditionPath ? (
          <>
            <div>
              <label className="block text-xs font-bold text-navy uppercase mb-1.5">Loại nhánh</label>
              <div className="flex gap-3">
                <span className={clsx('px-3 py-1.5 rounded text-xs font-bold', pathLabel === 'TRUE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200')}>
                  {pathLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                {pathLabel === 'TRUE' ? 'Đi theo đường này khi điều kiện đúng.' : 'Đi theo đường này khi điều kiện không đúng (fallback).'}
              </p>
            </div>

            {pathLabel === 'TRUE' && (
              <div className="pt-4 border-t border-border">
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">Điều kiện</label>
                <button
                  onClick={() => setIsConditionOpen(true)}
                  className="w-full border border-primary/30 bg-primary/5 rounded px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
                >
                  {condition ? 'Chỉnh sửa điều kiện' : 'Thiết lập điều kiện'}
                </button>
                {condition && (
                  <code className="mt-2 block bg-gray-50 border border-border rounded px-3 py-2 text-xs font-mono text-navy whitespace-pre-wrap">
                    {condition}
                  </code>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => onUpdate({ isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">Đặt làm nhánh mặc định (fallback)</span>
              </label>
              <p className="mt-1 text-xs text-muted">Nhánh mặc định dùng khi không có nhánh nào khớp điều kiện.</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted bg-gray-50 border border-border rounded p-3">
            Đường kết nối thông thường. Chọn đường đi này để xóa hoặc xem thông tin.
          </p>
        )}

        <div className="pt-4 border-t border-border">
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-danger/30 rounded text-sm font-medium text-danger hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-4 h-4" /> Xóa đường đi
          </button>
        </div>
      </div>

      <ConditionBuilderModal
        isOpen={isConditionOpen}
        onClose={() => setIsConditionOpen(false)}
        expression={condition}
        onSave={(expr) => { onUpdate({ condition: expr }); setIsConditionOpen(false); }}
      />
    </div>
  );
}