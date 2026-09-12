import { useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Code2,
  Paperclip,
  Check
} from 'lucide-react';
import type { FormSchema } from '../../types/form';

interface FormPreviewProps {
  schema: FormSchema;
}

export default function FormPreview({ schema }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const field of schema.fields) {
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
  const [submittedJson, setSubmittedJson] = useState<string | null>(null);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleMultiselectToggle = (key: string, val: string) => {
    const current = Array.isArray(formData[key]) ? [...formData[key]] : [];
    const idx = current.indexOf(val);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(val);
    }
    handleInputChange(key, current);
  };

  const validate = () => {
    const errs: Record<string, string> = {};

    for (const field of schema.fields) {
      const val = formData[field.key];

      // Required validation
      if (field.required) {
        if (val === undefined || val === null || val === '') {
          errs[field.key] = `Vui lòng nhập ${field.label.toLowerCase()}`;
          continue;
        }
        if (field.type === 'multiselect' && Array.isArray(val) && val.length === 0) {
          errs[field.key] = `Vui lòng chọn ít nhất 1 mục`;
          continue;
        }
        if (field.type === 'boolean' && val !== true) {
          errs[field.key] = `Trường này là bắt buộc xác nhận`;
          continue;
        }
      }

      // Type-specific validations if value exists
      if (val !== undefined && val !== null && val !== '') {
        if (field.type === 'number') {
          const num = Number(val);
          if (Number.isNaN(num)) {
            errs[field.key] = 'Giá trị phải là số hợp lệ';
          } else {
            if (field.validation?.min !== undefined && num < field.validation.min) {
              errs[field.key] = `Giá trị tối thiểu là ${field.validation.min}`;
            }
            if (field.validation?.max !== undefined && num > field.validation.max) {
              errs[field.key] = `Giá trị tối đa là ${field.validation.max}`;
            }
          }
        }

        if (field.type === 'string' || field.type === 'textarea') {
          const str = String(val);
          if (field.validation?.minLength !== undefined && str.length < field.validation.minLength) {
            errs[field.key] = `Độ dài tối thiểu là ${field.validation.minLength} ký tự`;
          }
          if (field.validation?.maxLength !== undefined && str.length > field.validation.maxLength) {
            errs[field.key] = `Độ dài tối đa là ${field.validation.maxLength} ký tự`;
          }
          if (field.validation?.pattern) {
            try {
              const reg = new RegExp(field.validation.pattern);
              if (!reg.test(str)) {
                errs[field.key] = 'Định dạng dữ liệu không khớp với quy tắc yêu cầu';
              }
            } catch {
              // Ignore invalid regex
            }
          }
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setSubmittedJson(JSON.stringify(formData, null, 2));
    } else {
      setSubmittedJson(null);
    }
  };

  const handleReset = () => {
    setFormData({});
    setErrors({});
    setSubmittedJson(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-900">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <h4 className="text-xs font-bold">Chế độ Xem trước Tương tác (Interactive Preview)</h4>
              <p className="text-[11px] text-blue-700">
                Điền thử dữ liệu thực tế và kiểm tra phản hồi validation trước khi xuất bản.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Đặt lại
          </button>
        </div>

        {/* Dynamic Form Render */}
        <form onSubmit={handleSimulateSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {schema.fields.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">
              Biểu mẫu chưa có trường nào để hiển thị xem trước.
            </p>
          ) : (
            schema.fields.map((field) => {
              const err = errors[field.key];
              const val = formData[field.key];

              return (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      key: {field.key}
                    </span>
                  </div>

                  {/* Input Rendering */}
                  {field.type === 'string' && (
                    <input
                      type="text"
                      placeholder={field.placeholder || 'Nhập văn bản...'}
                      value={val ?? ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      placeholder={field.placeholder || 'Nhập đoạn văn bản...'}
                      value={val ?? ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all resize-none ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      type="number"
                      placeholder={field.placeholder || '0'}
                      value={val ?? ''}
                      onChange={(e) =>
                        handleInputChange(
                          field.key,
                          e.target.value === '' ? '' : Number(e.target.value)
                        )
                      }
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      value={val ?? ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    >
                      <option value="">{field.placeholder || '-- Chọn một mục --'}</option>
                      {(field.options || []).map((o, idx) => (
                        <option key={idx} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'multiselect' && (
                    <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                      {(field.options || []).map((o, idx) => {
                        const isChecked = Array.isArray(val) && val.includes(o.value);
                        return (
                          <label
                            key={idx}
                            onClick={() => handleMultiselectToggle(field.key, o.value)}
                            className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-primary border-primary text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span>{o.label}</span>
                          </label>
                        );
                      })}
                      {(!field.options || field.options.length === 0) && (
                        <p className="text-[11px] text-slate-400 italic">
                          Chưa cấu hình tùy chọn trong trường này
                        </p>
                      )}
                    </div>
                  )}

                  {field.type === 'boolean' && (
                    <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!val}
                        onChange={(e) => handleInputChange(field.key, e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                      />
                      <span className="text-xs text-slate-700">
                        {field.placeholder || 'Đồng ý / Xác nhận'}
                      </span>
                    </label>
                  )}

                  {field.type === 'date' && (
                    <input
                      type="date"
                      value={val ?? ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  )}

                  {field.type === 'datetime' && (
                    <input
                      type="datetime-local"
                      value={val ?? ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={`w-full px-3.5 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                        err
                          ? 'border-rose-300 focus:ring-rose-200 focus:border-rose-500'
                          : 'border-slate-200 focus:ring-primary/20 focus:border-primary'
                      }`}
                    />
                  )}

                  {field.type === 'file' && (
                    <div className="flex items-center justify-center p-4 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer text-xs text-slate-500 gap-2">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span>
                        Chọn tệp mô phỏng (hỗ trợ {field.validation?.allowedFileTypes?.join(', ') || 'tất cả định dạng'})
                      </span>
                    </div>
                  )}

                  {/* Help text */}
                  {field.helpText && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">{field.helpText}</p>
                  )}

                  {/* Error display */}
                  {err && (
                    <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-medium pt-0.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {schema.fields.length > 0 && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Kiểm tra Dữ liệu (Simulate Submit)
              </button>
            </div>
          )}
        </form>

        {/* Output JSON Viewer */}
        {submittedJson && (
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-xl space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold font-mono">Dữ liệu Output (context.formData)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                VALIDATION PASSED
              </span>
            </div>
            <pre className="text-xs font-mono bg-slate-950 p-4 rounded-xl overflow-x-auto text-emerald-300">
              {submittedJson}
            </pre>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dữ liệu JSON trên đây chính là payload mà người dùng cuối sẽ nộp khi tạo Ticket, và sẽ được nạp trực tiếp vào Runtime Context của Workflow để các Condition Node rẽ nhánh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
