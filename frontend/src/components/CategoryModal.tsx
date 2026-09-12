import { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  TagIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  SparklesIcon,
  BriefcaseIcon,
  CreditCardIcon,
  UserGroupIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { api } from '../api/client';
import type { FormSummary, FormVersion } from '../types/form';
import type { WorkflowDefinition } from '../types/workflow';
import type {
  TicketCategoryDetail,
  CreateTicketCategoryDto,
  UpdateTicketCategoryDto,
  CompatibilityValidationResult,
} from '../types/category';

interface CategoryModalProps {
  category?: TicketCategoryDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

const PRESET_COLORS = [
  { name: 'Xanh lam', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Tím', value: '#8B5CF6', bg: 'bg-purple-500' },
  { name: 'Xanh lục', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Hổ phách', value: '#F59E0B', bg: 'bg-amber-500' },
  { name: 'Hồng', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Đỏ', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Chàm', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Xám thép', value: '#64748B', bg: 'bg-slate-500' },
];

const PRESET_ICONS = [
  { id: 'FolderIcon', label: 'Thư mục', Icon: FolderIcon },
  { id: 'BriefcaseIcon', label: 'Công việc', Icon: BriefcaseIcon },
  { id: 'DocumentTextIcon', label: 'Tài liệu', Icon: DocumentTextIcon },
  { id: 'CreditCardIcon', label: 'Chi phí / Tài chính', Icon: CreditCardIcon },
  { id: 'UserGroupIcon', label: 'Nhân sự', Icon: UserGroupIcon },
  { id: 'TagIcon', label: 'Thẻ tag', Icon: TagIcon },
  { id: 'SparklesIcon', label: 'Dịch vụ', Icon: SparklesIcon },
];

export default function CategoryModal({ category, onClose, onSaved }: CategoryModalProps) {
  const isEdit = Boolean(category);

  // Basic info
  const [name, setName] = useState(category?.name || '');
  const [code, setCode] = useState(category?.code || '');
  const [description, setDescription] = useState(category?.description || '');
  const [icon, setIcon] = useState(category?.icon || 'FolderIcon');
  const [color, setColor] = useState(category?.color || '#3B82F6');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);

  // Forms and Workflows catalog
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);

  // Selected Form & Versions
  const [selectedFormId, setSelectedFormId] = useState<string>(category?.formDefinitionId || '');
  const [formVersions, setFormVersions] = useState<FormVersion[]>([]);
  const [selectedFormVersionId, setSelectedFormVersionId] = useState<string>(category?.formVersionId || '');
  const [loadingFormVersions, setLoadingFormVersions] = useState(false);

  // Selected Workflow & Versions
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(category?.workflowId || '');
  const [workflowVersions, setWorkflowVersions] = useState<any[]>([]);
  const [selectedWorkflowExecutableId, setSelectedWorkflowExecutableId] = useState<string>(
    category?.workflowExecutableId || ''
  );
  const [loadingWorkflowVersions, setLoadingWorkflowVersions] = useState(false);

  // Field Mapping: { [workflowField]: formField }
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(category?.fieldMapping || {});

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CompatibilityValidationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-slug code on name change if not editing
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEdit && (!code || code === generateCode(name))) {
      setCode(generateCode(val));
    }
  };

  const generateCode = (text: string) => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toUpperCase()
      .slice(0, 48);
  };

  // 1. Fetch initial forms & workflows
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        setLoadingCatalogs(true);
        const [formsRes, workflowsRes] = await Promise.all([
          api.forms.list(),
          api.workflows.list(),
        ]);
        setForms(formsRes.filter((f) => f.status === 'PUBLISHED' || f.latestVersion));
        setWorkflows(workflowsRes);
      } catch (err) {
        console.error('Lỗi khi tải danh mục Form và Workflow', err);
      } finally {
        setLoadingCatalogs(false);
      }
    };
    void fetchCatalogs();
  }, []);

  // 2. Fetch Form versions when selectedFormId changes
  useEffect(() => {
    if (!selectedFormId) {
      setFormVersions([]);
      return;
    }
    const fetchFV = async () => {
      try {
        setLoadingFormVersions(true);
        const list = await api.forms.versions(selectedFormId);
        setFormVersions(list);
        if (list.length > 0 && !list.some((v) => v.id === selectedFormVersionId)) {
          // Default to latest version
          setSelectedFormVersionId(list[0].id);
        }
      } catch (err) {
        console.error('Lỗi khi lấy phiên bản Form', err);
      } finally {
        setLoadingFormVersions(false);
      }
    };
    void fetchFV();
  }, [selectedFormId]);

  // 3. Fetch Workflow versions when selectedWorkflowId changes
  useEffect(() => {
    if (!selectedWorkflowId) {
      setWorkflowVersions([]);
      return;
    }
    const fetchWV = async () => {
      try {
        setLoadingWorkflowVersions(true);
        const list = await api.workflows.versions(selectedWorkflowId);
        const publishedList = list.filter((v: any) => v.status === 'PUBLISHED');
        setWorkflowVersions(publishedList);
        if (publishedList.length > 0 && !publishedList.some((v: any) => String(v.id) === selectedWorkflowExecutableId)) {
          setSelectedWorkflowExecutableId(String(publishedList[0].id));
        }
      } catch (err) {
        console.error('Lỗi khi lấy phiên bản Workflow', err);
      } finally {
        setLoadingWorkflowVersions(false);
      }
    };
    void fetchWV();
  }, [selectedWorkflowId]);

  // 4. Compatibility Validation trigger
  const runValidation = useCallback(
    async (fvId: string, wvId: string, mapping: Record<string, string>) => {
      if (!fvId || !wvId) {
        setValidationResult(null);
        return;
      }
      try {
        setValidating(true);
        setSaveError(null);
        const res = await api.ticketCategories.validateMapping({
          formVersionId: fvId,
          workflowExecutableId: wvId,
          fieldMapping: mapping,
        });
        setValidationResult(res);
      } catch (err: any) {
        setSaveError(err.message || 'Lỗi khi kiểm tra tính tương thích');
      } finally {
        setValidating(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedFormVersionId && selectedWorkflowExecutableId) {
      void runValidation(selectedFormVersionId, selectedWorkflowExecutableId, fieldMapping);
    } else {
      setValidationResult(null);
    }
  }, [selectedFormVersionId, selectedWorkflowExecutableId, fieldMapping, runValidation]);

  // Auto-match fields when validation result reveals matching names
  const handleAutoMatch = () => {
    if (!validationResult) return;
    const newMapping = { ...fieldMapping };
    const formKeys = new Set(validationResult.formFields.map((f) => f.key));

    validationResult.workflowFields.forEach((wf) => {
      if (formKeys.has(wf.field) && !newMapping[wf.field]) {
        newMapping[wf.field] = wf.field;
      }
    });
    setFieldMapping(newMapping);
  };

  const handleFieldMappingChange = (wfField: string, formField: string) => {
    setFieldMapping((prev) => {
      const next = { ...prev };
      if (!formField) {
        delete next[wfField];
      } else {
        next[wfField] = formField;
      }
      return next;
    });
  };

  // Submit Save
  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Vui lòng nhập tên danh mục');
      return;
    }
    if (!code.trim()) {
      setSaveError('Vui lòng nhập mã danh mục');
      return;
    }
    if (!selectedFormVersionId) {
      setSaveError('Vui lòng chọn một phiên bản Biểu mẫu (FormVersion)');
      return;
    }
    if (!selectedWorkflowExecutableId) {
      setSaveError('Vui lòng chọn một phiên bản Quy trình (Workflow Version)');
      return;
    }
    if (validationResult && !validationResult.valid) {
      setSaveError('Không thể lưu: Vui lòng giải quyết các lỗi không tương thích giữa Form và Workflow');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      if (isEdit && category) {
        const updateDto: UpdateTicketCategoryDto = {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          icon,
          color,
          formVersionId: selectedFormVersionId,
          workflowExecutableId: selectedWorkflowExecutableId,
          fieldMapping,
          isActive,
        };
        await api.ticketCategories.update(category.id, updateDto);
      } else {
        const createDto: CreateTicketCategoryDto = {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
          icon,
          color,
          formVersionId: selectedFormVersionId,
          workflowExecutableId: selectedWorkflowExecutableId,
          fieldMapping,
          isActive,
        };
        await api.ticketCategories.create(createDto);
      }

      onSaved();
    } catch (err: any) {
      setSaveError(err.message || 'Lỗi khi lưu danh mục ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <FolderIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Chỉnh sửa Danh mục Ticket' : 'Tạo mới Danh mục Ticket'}
              </h3>
              <p className="text-xs text-gray-500">
                Gắn kết biểu mẫu động (FormVersion) và quy trình thực thi (Workflow) thành dịch vụ khả dụng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Lỗi cấu hình</p>
                <p className="mt-0.5 text-xs text-red-600">{saveError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              1. Thông tin Danh mục & Nhận diện
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ví dụ: Đăng ký Đi Công Tác, Xin Nghỉ Phép"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã danh mục (Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CAT_BUSINESS_TRIP"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả dịch vụ</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục đích và đối tượng áp dụng của danh mục yêu cầu này..."
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Icon & Color Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Biểu tượng (Icon)</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map(({ id, label, Icon: IconComp }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setIcon(id)}
                      title={label}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        icon === id
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Màu nhận diện</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      title={c.name}
                      className={`w-7 h-7 rounded-full transition-transform ${c.bg} ${
                        color === c.value
                          ? 'ring-2 ring-offset-2 ring-blue-600 scale-110'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActiveCheck"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActiveCheck" className="text-xs font-medium text-gray-700 select-none">
                Kích hoạt danh mục này ngay trên Cổng Dịch vụ (Active)
              </label>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Decoupled Binding (Form & Workflow) */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              2. Ghép cặp Form Version & Workflow Executable
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Form Column */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <DocumentDuplicateIcon className="w-5 h-5 text-indigo-500" />
                  <span>Biểu mẫu (Form Engine)</span>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Chọn Form:</label>
                  <select
                    value={selectedFormId}
                    onChange={(e) => {
                      setSelectedFormId(e.target.value);
                      setSelectedFormVersionId('');
                    }}
                    disabled={loadingCatalogs}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Chọn biểu mẫu --</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Phiên bản đã xuất bản (FormVersion):</label>
                  <select
                    value={selectedFormVersionId}
                    onChange={(e) => setSelectedFormVersionId(e.target.value)}
                    disabled={!selectedFormId || loadingFormVersions || formVersions.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {formVersions.length === 0 ? (
                      <option value="">
                        {selectedFormId ? 'Chưa có phiên bản nào được Publish' : '-- Chưa chọn Form --'}
                      </option>
                    ) : (
                      formVersions.map((v) => (
                        <option key={v.id} value={v.id}>
                          Phiên bản v{v.versionNumber} ({new Date(v.publishedAt).toLocaleDateString('vi-VN')})
                        </option>
                      ))
                    )}
                  </select>
                  {formVersions.length === 0 && selectedFormId && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      Biểu mẫu này chưa được Publish. Hãy vào Form Builder để publish v1.
                    </p>
                  )}
                </div>
              </div>

              {/* Workflow Column */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                  <span>Quy trình (Workflow Engine)</span>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Chọn Workflow:</label>
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => {
                      setSelectedWorkflowId(e.target.value);
                      setSelectedWorkflowExecutableId('');
                    }}
                    disabled={loadingCatalogs}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Chọn workflow --</option>
                    {workflows.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type || 'Approval'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Phiên bản đã xuất bản (Executable Version):</label>
                  <select
                    value={selectedWorkflowExecutableId}
                    onChange={(e) => setSelectedWorkflowExecutableId(e.target.value)}
                    disabled={!selectedWorkflowId || loadingWorkflowVersions || workflowVersions.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {workflowVersions.length === 0 ? (
                      <option value="">
                        {selectedWorkflowId ? 'Chưa có phiên bản nào được Publish' : '-- Chưa chọn Workflow --'}
                      </option>
                    ) : (
                      workflowVersions.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          Phiên bản v{v.versionNo} ({new Date(v.publishedAt || v.createdAt).toLocaleDateString('vi-VN')})
                        </option>
                      ))
                    )}
                  </select>
                  {workflowVersions.length === 0 && selectedWorkflowId && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      Workflow này chưa được Publish. Hãy vào Workflow Designer để Publish.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Compatibility Validation & Field Mapping */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  3. Đối soát Tương thích & Cấu hình Field Mapping
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Kiểm tra xem các điều kiện rẽ nhánh (Condition Rules) trong Workflow có khớp với các trường trong Form không
                </p>
              </div>

              {selectedFormVersionId && selectedWorkflowExecutableId && (
                <button
                  type="button"
                  onClick={handleAutoMatch}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  <span>Tự động khớp trường (Auto-match)</span>
                </button>
              )}
            </div>

            {/* Validation Feedback Status Banner */}
            {validating ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 text-xs">
                <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang thực hiện thuật toán đối soát tương thích (Compatibility Validation)...</span>
              </div>
            ) : validationResult ? (
              validationResult.valid ? (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm text-emerald-900">
                      Hoàn toàn tương thích!
                    </p>
                    <p className="mt-0.5 text-emerald-700">
                      Tất cả {validationResult.workflowFields.length} trường quy tắc trong Workflow đều đã được đối chiếu an toàn với dữ liệu của Biểu mẫu.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                    <span>Phát hiện {validationResult.errors.length} lỗi không tương thích giữa Form và Workflow:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-700 pl-2">
                    {validationResult.errors.map((err, idx) => (
                      <li key={idx} className="font-mono text-[11px]">
                        <strong>[{err.errorCode}]</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-red-600 italic">
                    Gợi ý: Sử dụng bảng bên dưới để ánh xạ (Field Mapping) sang trường đúng của Form, hoặc chọn FormVersion có các trường phù hợp.
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center text-xs text-gray-400">
                Hãy chọn cả FormVersion và WorkflowVersion ở Bước 2 để hệ thống đối soát tương thích tự động.
              </div>
            )}

            {/* Warnings list if any */}
            {validationResult && validationResult.warnings.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                  <span>Cảnh báo biến tham chiếu template ({validationResult.warnings.length}):</span>
                </div>
                <ul className="list-disc list-inside text-amber-700 pl-2 text-[11px]">
                  {validationResult.warnings.map((w, idx) => (
                    <li key={idx}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Field Mapping Matrix Table */}
            {validationResult && validationResult.workflowFields.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100/75 border-b border-gray-200 text-gray-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Biến yêu cầu trong Workflow</th>
                      <th className="py-2.5 px-4 w-10 text-center">Ánh xạ</th>
                      <th className="py-2.5 px-4">Trường dữ liệu trong Form</th>
                      <th className="py-2.5 px-4">Trạng thái tương thích</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {validationResult.workflowFields.map((wf) => {
                      const currentMapped = fieldMapping[wf.field] || wf.field;
                      const matchedForm = validationResult.formFields.find((f) => f.key === currentMapped);
                      const error = validationResult.errors.find((e) => e.requiredField === wf.field);

                      return (
                        <tr key={wf.field} className="hover:bg-gray-50/50">
                          {/* Workflow field */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900">{wf.field}</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono">
                                {wf.fieldType}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-0.5">Dùng tại Node: {wf.nodeName}</p>
                          </td>

                          {/* Arrow */}
                          <td className="py-2.5 px-4 text-center text-gray-400">
                            <ArrowRightIcon className="w-4 h-4 mx-auto" />
                          </td>

                          {/* Form field selector */}
                          <td className="py-2.5 px-4">
                            <select
                              value={fieldMapping[wf.field] || ''}
                              onChange={(e) => handleFieldMappingChange(wf.field, e.target.value)}
                              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                            >
                              <option value="">
                                {matchedForm && !fieldMapping[wf.field]
                                  ? `-- Mặc định dùng '${wf.field}' (${matchedForm.label}) --`
                                  : `-- Chọn trường Form để map --`}
                              </option>
                              {validationResult.formFields.map((ff) => (
                                <option key={ff.key} value={ff.key}>
                                  {ff.label} ({ff.key} - {ff.type})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Status badge */}
                          <td className="py-2.5 px-4">
                            {error ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
                                <XCircleIcon className="w-3.5 h-3.5" />
                                {error.errorCode === 'MISSING_FIELD' ? 'Thiếu trường' : 'Sai kiểu'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                Hợp lệ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/50">
          <div className="text-xs text-gray-500">
            {validationResult && !validationResult.valid && (
              <span className="text-red-600 font-medium">
                Vui lòng xử lý {validationResult.errors.length} lỗi tương thích để mở khóa nút Lưu.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                validating ||
                !name.trim() ||
                !code.trim() ||
                !selectedFormVersionId ||
                !selectedWorkflowExecutableId ||
                (validationResult !== null && !validationResult.valid)
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Cập nhật Danh mục' : 'Lưu Danh mục'}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
