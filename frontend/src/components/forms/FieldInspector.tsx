import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sliders,
  Settings,
} from 'lucide-react';
import type { FormField, FormFieldOption } from '../../types/form';

interface FieldInspectorProps {
  field: FormField | null;
  onUpdate: (updated: FormField) => void;
  onClose: () => void;
}

export default function FieldInspector({ field, onUpdate, onClose }: FieldInspectorProps) {
  const [keyLocked, setKeyLocked] = useState(true);

  useEffect(() => {
    // Lock key editing by default when selecting a field
    setKeyLocked(true);
  }, [field?.id]);

  if (!field) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col items-center justify-center p-6 text-center shrink-0 text-slate-400">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-xs font-semibold text-slate-600">Chưa chọn trường nào</p>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
          Nhấp vào bất kỳ trường nào trên Canvas để thiết lập thuộc tính và quy tắc validation.
        </p>
      </div>
    );
  }

  const handleLabelChange = (newLabel: string) => {
    const changes: Partial<FormField> = { label: newLabel };
    if (keyLocked) {
      // Auto-derive key from label
      const slug = newLabel
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();
      if (slug) {
        changes.key = slug;
      }
    }
    onUpdate({ ...field, ...changes });
  };

  const handleKeyChange = (newKey: string) => {
    setKeyLocked(false);
    onUpdate({
      ...field,
      key: newKey.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase(),
    });
  };

  const handleAddOption = () => {
    const opts = field.options ? [...field.options] : [];
    const count = opts.length + 1;
    opts.push({
      label: `Tùy chọn ${count}`,
      value: `OPT_${count}`,
    });
    onUpdate({ ...field, options: opts });
  };

  const handleUpdateOption = (index: number, updated: Partial<FormFieldOption>) => {
    if (!field.options) return;
    const opts = [...field.options];
    opts[index] = { ...opts[index], ...updated };
    onUpdate({ ...field, options: opts });
  };

  const handleRemoveOption = (index: number) => {
    if (!field.options) return;
    const opts = field.options.filter((_, i) => i !== index);
    onUpdate({ ...field, options: opts });
  };

  const handleValidationChange = (key: string, val: any) => {
    const valObj = { ...(field.validation || {}) };
    if (val === '' || val === undefined || Number.isNaN(val)) {
      delete (valObj as any)[key];
    } else {
      (valObj as any)[key] = val;
    }
    onUpdate({ ...field, validation: valObj });
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-slate-800">Cấu hình thuộc tính</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Properties */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Thông tin hiển thị
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhãn hiển thị (Label) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Mã biến (Field Key) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setKeyLocked(!keyLocked)}
                className="text-[10px] text-primary hover:underline"
              >
                {keyLocked ? 'Sửa thủ công' : 'Khóa tự động'}
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={field.key}
                disabled={keyLocked}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-slate-50 text-slate-800"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                {field.type}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Dùng trong Workflow Condition: <code className="text-primary font-mono font-semibold">{`context.formData.${field.key || 'key'}`}</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gợi ý nhập liệu (Placeholder)
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ ...field, placeholder: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chú thích hướng dẫn (Help text)
            </label>
            <input
              type="text"
              value={field.helpText || ''}
              onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Behavior & Constraints */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ràng buộc & Hành vi
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <span className="text-xs font-semibold text-slate-700">Bắt buộc nhập (Required)</span>
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onUpdate({ ...field, required: e.target.checked })}
              className="w-4 h-4 rounded text-primary focus:ring-primary/20"
            />
          </label>

          {field.type !== 'file' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giá trị mặc định (Default Value)
              </label>
              {field.type === 'boolean' ? (
                <select
                  value={field.defaultValue === true ? 'true' : 'false'}
                  onChange={(e) => onUpdate({ ...field, defaultValue: e.target.value === 'true' })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="false">Sai / Tắt (False)</option>
                  <option value="true">Đúng / Bật (True)</option>
                </select>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={field.defaultValue ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      ...field,
                      defaultValue: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <input
                  type="text"
                  value={field.defaultValue ?? ''}
                  onChange={(e) => onUpdate({ ...field, defaultValue: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              )}
            </div>
          )}
        </div>

        {/* Options for select / multiselect */}
        {(field.type === 'select' || field.type === 'multiselect') && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Danh sách Tùy chọn
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Plus className="w-3 h-3" /> Thêm
              </button>
            </div>

            <div className="space-y-2">
              {(field.options || []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Nhãn hiển thị"
                    value={opt.label}
                    onChange={(e) => handleUpdateOption(idx, { label: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Mã VALUE"
                    value={opt.value}
                    onChange={(e) => handleUpdateOption(idx, { value: e.target.value.toUpperCase() })}
                    className="w-24 px-2 py-1 text-xs font-mono uppercase rounded border border-slate-200 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(!field.options || field.options.length === 0) && (
                <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Chưa có tùy chọn nào. Vui lòng bấm &quot;Thêm&quot; để tạo tùy chọn cho người dùng chọn.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Validation rules per type */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Quy tắc Kiểm tra (Validation)
          </div>

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Nhỏ nhất (Min)
                </label>
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) =>
                    handleValidationChange(
                      'min',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Lớn nhất (Max)
                </label>
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) =>
                    handleValidationChange(
                      'max',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200"
                />
              </div>
            </div>
          )}

          {(field.type === 'string' || field.type === 'textarea') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Độ dài tối thiểu
                  </label>
                  <input
                    type="number"
                    value={field.validation?.minLength ?? ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'minLength',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Độ dài tối đa
                  </label>
                  <input
                    type="number"
                    value={field.validation?.maxLength ?? ''}
                    onChange={(e) =>
                      handleValidationChange(
                        'maxLength',
                        e.target.value === '' ? undefined : Number(e.target.value)
                      )
                    }
                    className="w-full px-2.5 py-1 text-xs rounded border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Biểu thức Regex (Pattern)
                </label>
                <input
                  type="text"
                  placeholder="VD: ^[0-9]{10}$"
                  value={field.validation?.pattern ?? ''}
                  onChange={(e) => handleValidationChange('pattern', e.target.value || undefined)}
                  className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200"
                />
              </div>
            </>
          )}

          {field.type === 'file' && (
            <>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Định dạng cho phép (cách nhau dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder=".pdf, .png, .jpg, .docx"
                  value={(field.validation?.allowedFileTypes || []).join(', ')}
                  onChange={(e) => {
                    const arr = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean);
                    handleValidationChange('allowedFileTypes', arr.length ? arr : undefined);
                  }}
                  className="w-full px-2.5 py-1 text-xs font-mono rounded border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Dung lượng tối đa (MB)
                </label>
                <input
                  type="number"
                  placeholder="10"
                  value={field.validation?.maxFileSizeMb ?? ''}
                  onChange={(e) =>
                    handleValidationChange(
                      'maxFileSizeMb',
                      e.target.value === '' ? undefined : Number(e.target.value)
                    )
                  }
                  className="w-full px-2.5 py-1 text-xs rounded border border-slate-200"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
