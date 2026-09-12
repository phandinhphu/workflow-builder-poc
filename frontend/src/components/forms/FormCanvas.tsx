import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Sparkles,
  FileText,
  Calendar,
  Clock,
  Paperclip,
  CheckSquare,
  List,
  Hash,
  AlignLeft,
  Type,
  ToggleLeft
} from 'lucide-react';
import type { FormField, FormFieldType } from '../../types/form';

interface FormCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onMoveField: (fromIndex: number, toIndex: number) => void;
  onDuplicateField: (index: number) => void;
  onDeleteField: (id: string) => void;
}

function getFieldIcon(type: FormFieldType) {
  switch (type) {
    case 'string':
      return Type;
    case 'textarea':
      return AlignLeft;
    case 'number':
      return Hash;
    case 'select':
      return List;
    case 'multiselect':
      return CheckSquare;
    case 'boolean':
      return ToggleLeft;
    case 'date':
      return Calendar;
    case 'datetime':
      return Clock;
    case 'file':
      return Paperclip;
    default:
      return FileText;
  }
}

export default function FormCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onMoveField,
  onDuplicateField,
  onDeleteField,
}: FormCanvasProps) {
  if (fields.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
        <div className="max-w-md w-full text-center p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-primary">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-slate-800">Biểu mẫu chưa có trường dữ liệu</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Chọn các thành phần từ bảng <span className="font-semibold text-slate-700">Palette</span> ở cột bên trái để bắt đầu thiết kế biểu mẫu.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600">
            Hỗ trợ 9 loại trường: Text, Số, Select, Checkbox, File...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      <div className="max-w-2xl mx-auto space-y-3.5 pb-16">
        {fields.map((field, idx) => {
          const isSelected = field.id === selectedFieldId;
          const Icon = getFieldIcon(field.type);

          return (
            <div
              key={field.id}
              onClick={() => onSelectField(field.id)}
              className={`group relative rounded-xl border bg-white p-4 transition-all cursor-pointer shadow-sm ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow'
              }`}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`p-1.5 rounded-md text-xs ${
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {field.label || 'Chưa đặt tên'}
                  </span>
                  {field.required && <span className="text-rose-500 font-bold text-xs">*</span>}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 truncate">
                    key: {field.key}
                  </span>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => onMoveField(idx, idx - 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                    title="Di chuyển lên"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === fields.length - 1}
                    onClick={() => onMoveField(idx, idx + 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                    title="Di chuyển xuống"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateField(idx)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                    title="Nhân bản trường"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteField(field.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                    title="Xóa trường"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mock Input Rendering */}
              <div className="pointer-events-none mt-1">
                {field.type === 'string' && (
                  <input
                    type="text"
                    disabled
                    placeholder={field.placeholder || 'Nhập văn bản...'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400"
                  />
                )}
                {field.type === 'textarea' && (
                  <textarea
                    rows={2}
                    disabled
                    placeholder={field.placeholder || 'Nhập đoạn văn bản...'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400 resize-none"
                  />
                )}
                {field.type === 'number' && (
                  <input
                    type="number"
                    disabled
                    placeholder={field.placeholder || '0'}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400"
                  />
                )}
                {field.type === 'select' && (
                  <select
                    disabled
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400"
                  >
                    <option>{field.placeholder || '-- Chọn một mục --'}</option>
                    {(field.options || []).map((o, i) => (
                      <option key={i}>{o.label}</option>
                    ))}
                  </select>
                )}
                {field.type === 'multiselect' && (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                    {(field.options && field.options.length > 0 ? field.options : [{ label: 'Mục mẫu 1' }, { label: 'Mục mẫu 2' }]).map((o, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                        <CheckSquare className="w-2.5 h-2.5 text-primary" />
                        {o.label}
                      </span>
                    ))}
                  </div>
                )}
                {field.type === 'boolean' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <input type="checkbox" disabled checked={!!field.defaultValue} className="rounded text-primary" />
                    <span>{field.placeholder || 'Xác nhận đồng ý / Kích hoạt tùy chọn'}</span>
                  </div>
                )}
                {field.type === 'date' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>YYYY-MM-DD</span>
                  </div>
                )}
                {field.type === 'datetime' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>YYYY-MM-DD HH:mm</span>
                  </div>
                )}
                {field.type === 'file' && (
                  <div className="flex items-center justify-center p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 text-xs gap-2">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Kéo thả tệp hoặc nhấp để tải lên ({field.validation?.allowedFileTypes?.join(', ') || 'Tất cả định dạng'})</span>
                  </div>
                )}
              </div>

              {field.helpText && (
                <p className="text-[10px] text-slate-400 mt-1.5 italic">
                  {field.helpText}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
