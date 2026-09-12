import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Save,
  Send,
  History,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import type { FormDetail, FormField, FormFieldType, FormSchema } from '../types/form';
import FieldPalette from '../components/forms/FieldPalette';
import FormCanvas from '../components/forms/FormCanvas';
import FieldInspector from '../components/forms/FieldInspector';
import FormPreview from '../components/forms/FormPreview';
import FormVersionHistoryModal from '../components/forms/FormVersionHistoryModal';

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'designer' | 'preview'>('designer');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadForm = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.forms.get(id);
      setForm(data);
      const loadedFields = data.draftSchema?.fields || [];
      setFields(loadedFields);
      if (loadedFields.length > 0) {
        setSelectedFieldId(loadedFields[0].id);
      }
      setIsDirty(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Không thể tải thông tin biểu mẫu', 'error');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  // Handle Field Palette Add
  const handleAddField = (item: {
    type: FormFieldType;
    defaultLabel: string;
    defaultPlaceholder?: string;
  }) => {
    const count = fields.length + 1;
    const randomHex = Math.random().toString(36).substring(2, 8);
    const newKey = `field_${count}_${randomHex.substring(0, 4)}`;

    const newField: FormField = {
      id: `fld_${randomHex}`,
      key: newKey,
      label: `${item.defaultLabel} ${count}`,
      type: item.type,
      placeholder: item.defaultPlaceholder,
      required: false,
      defaultValue: item.type === 'boolean' ? false : undefined,
      options:
        item.type === 'select' || item.type === 'multiselect'
          ? [
              { label: 'Tùy chọn 1', value: 'OPT_1' },
              { label: 'Tùy chọn 2', value: 'OPT_2' },
            ]
          : undefined,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setIsDirty(true);
  };

  // Handle Field Inspector Update
  const handleUpdateField = (updated: FormField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setIsDirty(true);
  };

  // Handle Field Canvas Reorder
  const handleMoveField = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setIsDirty(true);
  };

  // Handle Duplicate Field
  const handleDuplicateField = (idx: number) => {
    const target = fields[idx];
    if (!target) return;
    const randomHex = Math.random().toString(36).substring(2, 8);
    const duplicated: FormField = {
      ...JSON.parse(JSON.stringify(target)),
      id: `fld_${randomHex}`,
      key: `${target.key}_copy`,
      label: `${target.label} (Sao chép)`,
    };
    setFields((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, duplicated);
      return next;
    });
    setSelectedFieldId(duplicated.id);
    setIsDirty(true);
  };

  // Handle Delete Field
  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      const remaining = fields.filter((f) => f.id !== fieldId);
      setSelectedFieldId(remaining.length > 0 ? remaining[0].id : null);
    }
    setIsDirty(true);
  };

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!id || !form) return;
    setSaving(true);
    try {
      const schema: FormSchema = { fields };
      const updated = await api.forms.updateDraft(id, {
        name: form.name,
        description: form.description,
        draftSchema: schema,
      });
      setForm(updated);
      setIsDirty(false);
      showToast('Đã lưu bản nháp thành công!');
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu bản nháp', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Publish Version
  const handlePublish = async () => {
    if (!id || !form) return;
    if (fields.length === 0) {
      showToast('Không thể xuất bản biểu mẫu khi chưa có trường nào.', 'error');
      return;
    }

    if (isDirty) {
      await handleSaveDraft();
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xuất bản (Publish) phiên bản mới cho biểu mẫu "${form.name}"?\n\nToàn bộ cấu trúc sẽ được đóng băng snapshot bất biến để Ticket Category sử dụng.`
    );
    if (!confirmed) return;

    setPublishing(true);
    try {
      const version = await api.forms.publish(id);
      showToast(`Đã xuất bản thành công phiên bản v${version.versionNumber}!`);
      await loadForm();
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi xuất bản biểu mẫu', 'error');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-xs text-slate-400">
        Đang tải Form Studio...
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <p className="text-sm font-semibold text-slate-700">Không tìm thấy biểu mẫu</p>
        <button
          onClick={() => navigate('/forms')}
          className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-100">
      {/* Studio Header */}
      <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0 shadow-sm">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời khỏi trang?')) {
                return;
              }
              navigate('/forms');
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Quay lại danh sách biểu mẫu"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">{form.name}</h2>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {form.code}
              </span>
              {form.latestVersion ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  v{form.latestVersion}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Draft
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{fields.length} trường</span>
              <span>•</span>
              {isDirty ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Chưa lưu thay đổi
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Đã đồng bộ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'designer'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Thiết kế (Canvas)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trước (Preview)</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm"
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>Lịch sử ({form.latestVersion || 0})</span>
          </button>

          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>{saving ? 'Đang lưu...' : 'Lưu nháp'}</span>
          </button>

          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{publishing ? 'Đang Publish...' : 'Xuất bản (Publish)'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'designer' ? (
          <>
            {/* Left: Palette */}
            <FieldPalette onAddField={handleAddField} />

            {/* Center: Canvas */}
            <FormCanvas
              fields={fields}
              selectedFieldId={selectedFieldId}
              onSelectField={(fId) => setSelectedFieldId(fId)}
              onMoveField={handleMoveField}
              onDuplicateField={handleDuplicateField}
              onDeleteField={handleDeleteField}
            />

            {/* Right: Inspector */}
            <FieldInspector
              field={selectedField}
              onUpdate={handleUpdateField}
              onClose={() => setSelectedFieldId(null)}
            />
          </>
        ) : (
          /* Preview Mode */
          <FormPreview schema={{ fields }} />
        )}
      </div>

      {/* Version History Modal */}
      <FormVersionHistoryModal
        isOpen={historyOpen}
        formId={form.id}
        formName={form.name}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
