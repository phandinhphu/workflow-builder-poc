import React, { useState } from 'react';
import { X, Sparkles, FileText, AlertCircle } from 'lucide-react';
import type { CreateFormDto } from '../../types/form';

interface CreateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFormDto) => Promise<void>;
}

export default function CreateFormModal({ isOpen, onClose, onSubmit }: CreateFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isCustomCode, setIsCustomCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCustomCode) {
      // Auto-generate uppercase slug code from name
      const slug = val
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toUpperCase();
      setCode(slug ? `FORM_${slug}` : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên biểu mẫu');
      return;
    }
    if (!code.trim()) {
      setError('Vui lòng nhập mã định danh (Code)');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        draftSchema: { fields: [] },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo biểu mẫu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Tạo Biểu Mẫu Mới</h2>
              <p className="text-xs text-slate-500">Khởi tạo định nghĩa biểu mẫu độc lập (Decoupled Form)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên Biểu Mẫu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Đề xuất Đi công tác, Yêu cầu Mua sắm..."
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Mã Định Danh (Code) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCode(!isCustomCode)}
                className="text-[11px] text-primary hover:underline"
              >
                {isCustomCode ? 'Tự động tạo từ tên' : 'Tùy chỉnh mã'}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                disabled={!isCustomCode && !code}
                placeholder="VD: FORM_BUSINESS_TRIP"
                value={code}
                onChange={(e) => {
                  setIsCustomCode(true);
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                }}
                className="w-full px-3.5 py-2 text-sm font-mono uppercase rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-50"
              />
              {!isCustomCode && code && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                  auto-slug
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mã code duy nhất dùng để đối soát và liên kết với Ticket Category.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô Tả Biểu Mẫu
            </label>
            <textarea
              rows={3}
              placeholder="Mô tả mục đích sử dụng hoặc hướng dẫn điền đơn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {submitting ? 'Đang tạo...' : 'Tạo Biểu Mẫu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
