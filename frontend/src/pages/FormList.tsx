import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Sparkles,
  History,
  Edit3,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { FormSummary, CreateFormDto } from '../types/form';
import CreateFormModal from '../components/forms/CreateFormModal';
import FormVersionHistoryModal from '../components/forms/FormVersionHistoryModal';

export default function FormList() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // History modal state
  const [historyForm, setHistoryForm] = useState<{ id: string; name: string } | null>(null);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
      const res = await api.forms.list(statusParam, searchTerm || undefined);
      setForms(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleCreateForm = async (dto: CreateFormDto) => {
    const created = await api.forms.create(dto);
    navigate(`/forms/${created.id}/builder`);
  };

  const filteredForms = forms.filter((f) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Form Engine Core & Snapshot Versioning</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Quản lý Biểu mẫu (Form Management)</h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Thiết kế và cấu hình biểu mẫu độc lập (Decoupled Forms), quản trị phiên bản bất biến (Version Snapshot) sẵn sàng gắn kết động với quy trình Workflow.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'PUBLISHED', 'DRAFT', 'ARCHIVED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL'
                  ? 'Tất cả'
                  : st === 'PUBLISHED'
                  ? 'Đã xuất bản'
                  : st === 'DRAFT'
                  ? 'Bản nháp'
                  : 'Lưu trữ'}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors whitespace-nowrap w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Tạo Biểu Mẫu Mới
        </button>
      </div>

      {/* Form List / Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Đang tải danh sách biểu mẫu...
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Không tìm thấy biểu mẫu nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ lọc trạng thái.'
              : 'Hãy bắt đầu bằng việc tạo biểu mẫu đầu tiên để phục vụ cho các quy trình dịch vụ.'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg shadow-sm hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Tạo Biểu Mẫu Ngay
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
            >
              <div className="p-5 flex-1 space-y-3">
                {/* Status & Version Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {form.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {form.latestVersion ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        v{form.latestVersion}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Chưa publish
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        form.status === 'PUBLISHED'
                          ? 'bg-blue-50 text-blue-700'
                          : form.status === 'ARCHIVED'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {form.status}
                    </span>
                  </div>
                </div>

                {/* Name & Description */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
                    {form.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                    {form.description || 'Chưa có mô tả cho biểu mẫu này.'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {form.fieldCount} trường dữ liệu
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(form.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryForm({ id: form.id, name: form.name })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:underline"
                >
                  <History className="w-3.5 h-3.5" />
                  Lịch sử ({form.latestVersion || 0})
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/forms/${form.id}/builder`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Mở Studio
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateForm}
      />

      {/* Version History Modal */}
      {historyForm && (
        <FormVersionHistoryModal
          isOpen={!!historyForm}
          formId={historyForm.id}
          formName={historyForm.name}
          onClose={() => setHistoryForm(null)}
        />
      )}
    </div>
  );
}
