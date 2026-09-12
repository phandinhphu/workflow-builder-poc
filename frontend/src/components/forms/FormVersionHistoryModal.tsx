import { useState, useEffect } from 'react';
import {
  X,
  History,
  CheckCircle2,
  Calendar,
  User,
  Eye,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { FormVersion } from '../../types/form';
import { api } from '../../api/client';

interface FormVersionHistoryModalProps {
  isOpen: boolean;
  formId: string;
  formName: string;
  onClose: () => void;
}

export default function FormVersionHistoryModal({
  isOpen,
  formId,
  formName,
  onClose,
}: FormVersionHistoryModalProps) {
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !formId) return;
    setLoading(true);
    api.forms
      .versions(formId)
      .then((res) => {
        setVersions(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [isOpen, formId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Lịch sử Phiên bản Bất biến
              </h2>
              <p className="text-xs text-slate-500">
                Biểu mẫu: <span className="font-semibold text-slate-700">{formName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Đang tải danh sách phiên bản...
            </div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600">Chưa có phiên bản nào được xuất bản</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Khi bạn bấm &quot;Xuất bản (Publish)&quot; trên thanh công cụ Studio, hệ thống sẽ đóng băng snapshot v1 tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((ver) => {
                const isExpanded = expandedVersionId === ver.id;
                const fieldCount = ver.schemaSnapshot?.fields?.length || 0;

                return (
                  <div
                    key={ver.id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-slate-300 transition-all"
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          v{ver.versionNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {ver.publishedByName || 'Admin'}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(ver.publishedAt).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {fieldCount} trường
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-sm">
                            SHA: {ver.checksum}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Ẩn Snapshot' : 'Xem Snapshot'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-200 text-xs font-mono overflow-x-auto max-h-60">
                        <pre className="text-emerald-300">
                          {JSON.stringify(ver.schemaSnapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Tất cả phiên bản đều được đóng băng bất biến theo chuẩn Version Immutability
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
