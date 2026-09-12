import { useState, useEffect } from 'react';
import {
  AlertCircle,
  Paperclip,
  CheckCircle2,
  Calendar,
  Clock,
  Send,
  Loader2,
  FileText,
  Check,
} from 'lucide-react';
import type { FormField, FormSchema } from '../../types/form';

interface DynamicFormRendererProps {
  schema: FormSchema;
  formData?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  mode: 'edit' | 'readonly';
  onSubmit?: (data: Record<string, any>) => void;
  submitting?: boolean;
  submitButtonText?: string;
}

export default function DynamicFormRenderer({
  schema,
  formData: externalFormData,
  onChange,
  mode = 'edit',
  onSubmit,
  submitting = false,
  submitButtonText = 'Gửi yêu cầu',
}: DynamicFormRendererProps) {
  const [internalFormData, setInternalFormData] = useState<Record<string, any>>(() => {
    if (externalFormData) return { ...externalFormData };
    const initial: Record<string, any> = {};
    for (const field of schema.fields || []) {
      if (field.defaultValue !== undefined) {
        initial[field.key] = field.defaultValue;
      } else if (field.type === 'multiselect') {
        initial[field.key] = [];
      } else if (field.type === 'boolean') {
        initial[field.key] = false;
      }
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (externalFormData) {
      setInternalFormData({ ...externalFormData });
    }
  }, [externalFormData]);

  const currentData = externalFormData && mode === 'readonly' ? externalFormData : internalFormData;

  const handleInputChange = (key: string, value: any) => {
    if (mode === 'readonly') return;
    const next = { ...internalFormData, [key]: value };
    setInternalFormData(next);
    onChange?.(next);

    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleMultiselectToggle = (key: string, val: string) => {
    if (mode === 'readonly') return;
    const currentList = Array.isArray(currentData[key]) ? [...currentData[key]] : [];
    const idx = currentList.indexOf(val);
    if (idx >= 0) {
      currentList.splice(idx, 1);
    } else {
      currentList.push(val);
    }
    handleInputChange(key, currentList);
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of schema.fields || []) {
      const val = currentData[field.key];
      const isMissing = val === undefined || val === null || val === '';

      if (field.required) {
        if (isMissing) {
          newErrors[field.key] = `Vui lòng nhập ${field.label.toLowerCase()}`;
          continue;
        }
        if (field.type === 'multiselect' && Array.isArray(val) && val.length === 0) {
          newErrors[field.key] = `Vui lòng chọn ít nhất 1 mục`;
          continue;
        }
        if (field.type === 'boolean' && val !== true) {
          newErrors[field.key] = `Vui lòng xác nhận trường này`;
          continue;
        }
      }

      if (!isMissing) {
        if (field.type === 'number') {
          const num = Number(val);
          if (Number.isNaN(num)) {
            newErrors[field.key] = 'Giá trị phải là số hợp lệ';
          } else {
            if (field.validation?.min !== undefined && num < field.validation.min) {
              newErrors[field.key] = `Giá trị tối thiểu là ${field.validation.min}`;
            }
            if (field.validation?.max !== undefined && num > field.validation.max) {
              newErrors[field.key] = `Giá trị tối đa là ${field.validation.max}`;
            }
          }
        }

        if (field.type === 'string' || field.type === 'textarea') {
          const str = String(val);
          if (field.validation?.minLength !== undefined && str.length < field.validation.minLength) {
            newErrors[field.key] = `Độ dài tối thiểu là ${field.validation.minLength} ký tự`;
          }
          if (field.validation?.maxLength !== undefined && str.length > field.validation.maxLength) {
            newErrors[field.key] = `Độ dài tối đa là ${field.validation.maxLength} ký tự`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'readonly') return;
    if (validateAll()) {
      onSubmit?.(currentData);
    }
  };

  if (!schema?.fields || schema.fields.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm">Biểu mẫu này chưa có trường dữ liệu nào.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {schema.fields.map((field) => {
          const isFullWidth = field.type === 'textarea' || field.type === 'file';
          return (
            <div
              key={field.key}
              className={isFullWidth ? 'md:col-span-2' : 'col-span-1'}
            >
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                {field.label}
                {field.required && <span className="text-rose-500 ml-1">*</span>}
              </label>

              {renderFieldInput(field, currentData, mode, errors, handleInputChange, handleMultiselectToggle)}

              {errors[field.key] && mode === 'edit' && (
                <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors[field.key]}
                </p>
              )}

              {field.helpText && mode === 'edit' && !errors[field.key] && (
                <p className="mt-1 text-xs text-gray-400">{field.helpText}</p>
              )}
            </div>
          );
        })}
      </div>

      {mode === 'edit' && onSubmit && (
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-all shadow-sm shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{submitButtonText}</span>
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}

function renderFieldInput(
  field: FormField,
  formData: Record<string, any>,
  mode: 'edit' | 'readonly',
  errors: Record<string, string>,
  onChange: (key: string, val: any) => void,
  onMultiselectToggle: (key: string, val: string) => void
) {
  const val = formData[field.key];
  const hasError = !!errors[field.key];

  if (mode === 'readonly') {
    return renderReadOnlyValue(field, val);
  }

  // --- EDIT MODE ---
  switch (field.type) {
    case 'string':
      return (
        <input
          type="text"
          value={val ?? ''}
          placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-rose-300 ring-rose-100 text-rose-900'
              : 'border-gray-200 focus:border-primary focus:ring-primary/10 text-gray-900'
          }`}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={val ?? ''}
          placeholder={field.placeholder || '0'}
          min={field.validation?.min}
          max={field.validation?.max}
          step={field.validation?.step || 'any'}
          onChange={(e) => onChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-rose-300 ring-rose-100 text-rose-900'
              : 'border-gray-200 focus:border-primary focus:ring-primary/10 text-gray-900'
          }`}
        />
      );

    case 'textarea':
      return (
        <textarea
          rows={3}
          value={val ?? ''}
          placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}...`}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-rose-300 ring-rose-100 text-rose-900'
              : 'border-gray-200 focus:border-primary focus:ring-primary/10 text-gray-900'
          }`}
        />
      );

    case 'date':
      return (
        <div className="relative">
          <input
            type="date"
            value={val ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
              hasError
                ? 'border-rose-300 ring-rose-100'
                : 'border-gray-200 focus:border-primary focus:ring-primary/10'
            }`}
          />
          <Calendar className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      );

    case 'datetime':
      return (
        <div className="relative">
          <input
            type="datetime-local"
            value={val ?? ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            className={`w-full pl-3.5 pr-10 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
              hasError
                ? 'border-rose-300 ring-rose-100'
                : 'border-gray-200 focus:border-primary focus:ring-primary/10'
            }`}
          />
          <Clock className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      );

    case 'select':
      return (
        <select
          value={val ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
            hasError
              ? 'border-rose-300 ring-rose-100'
              : 'border-gray-200 focus:border-primary focus:ring-primary/10'
          }`}
        >
          <option value="">-- Chọn một tùy chọn --</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect': {
      const selectedList: string[] = Array.isArray(val) ? val : [];
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {field.options?.map((opt) => {
            const isChecked = selectedList.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => onMultiselectToggle(field.key, opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isChecked
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                }`}
              >
                {isChecked && <Check className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'boolean':
      return (
        <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100/70 transition-colors">
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => onChange(field.key, e.target.checked)}
            className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-gray-700">
            {field.placeholder || 'Đồng ý / Xác nhận'}
          </span>
        </label>
      );

    case 'file':
      return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-primary/50 transition-colors bg-gray-50/50">
          <Paperclip className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
          <p className="text-xs text-gray-600 font-medium">Kéo thả tệp hoặc bấm để chọn tệp</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Tối đa 25MB (PDF, DOCX, XLSX, PNG, JPG)</p>
          <input
            type="file"
            className="hidden"
            id={`file-${field.key}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange(field.key, file.name);
              }
            }}
          />
          <label
            htmlFor={`file-${field.key}`}
            className="inline-block mt-3 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 shadow-xs"
          >
            {val ? `Đã chọn: ${val}` : 'Chọn tệp từ máy'}
          </label>
        </div>
      );

    default:
      return (
        <input
          type="text"
          value={val ?? ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
        />
      );
  }
}

function renderReadOnlyValue(field: FormField, val: any) {
  if (val === undefined || val === null || val === '') {
    return <span className="text-sm text-gray-400 italic">Chưa nhập</span>;
  }

  switch (field.type) {
    case 'number':
      return (
        <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100">
          {typeof val === 'number' ? val.toLocaleString('vi-VN') : val}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {val ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Có / Đã xác nhận
            </span>
          ) : (
            <span className="text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-semibold">
              Không / Chưa xác nhận
            </span>
          )}
        </div>
      );

    case 'select': {
      const matched = field.options?.find((o) => o.value === String(val));
      return (
        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100">
          {matched ? matched.label : String(val)}
        </div>
      );
    }

    case 'multiselect': {
      const selectedVals: string[] = Array.isArray(val) ? val : [String(val)];
      return (
        <div className="flex flex-wrap gap-1.5">
          {selectedVals.map((v) => {
            const matched = field.options?.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium"
              >
                {matched ? matched.label : v}
              </span>
            );
          })}
        </div>
      );
    }

    case 'textarea':
      return (
        <div className="text-sm text-gray-800 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
          {String(val)}
        </div>
      );

    case 'file':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800">
          <Paperclip className="w-4 h-4 text-gray-500" />
          <span className="font-medium truncate max-w-xs">{String(val)}</span>
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-900 bg-gray-50 px-3.5 py-2.5 rounded-xl border border-gray-100 font-medium">
          {String(val)}
        </div>
      );
  }
}
