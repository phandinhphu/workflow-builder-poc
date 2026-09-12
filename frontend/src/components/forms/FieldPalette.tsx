import {
  Type,
  AlignLeft,
  Hash,
  List,
  CheckSquare,
  ToggleLeft,
  Calendar,
  Clock,
  Paperclip,
  Plus
} from 'lucide-react';
import type { FormFieldType } from '../../types/form';

interface PaletteItem {
  type: FormFieldType;
  label: string;
  description: string;
  icon: any;
  defaultLabel: string;
  defaultPlaceholder?: string;
}

const PALETTE_GROUPS: { groupName: string; items: PaletteItem[] }[] = [
  {
    groupName: 'Văn bản cơ bản',
    items: [
      {
        type: 'string',
        label: 'Văn bản ngắn',
        description: 'Nhập họ tên, tiêu đề, mã số...',
        icon: Type,
        defaultLabel: 'Trường văn bản',
        defaultPlaceholder: 'Nhập thông tin...',
      },
      {
        type: 'textarea',
        label: 'Đoạn văn bản',
        description: 'Ghi chú, lý do, mô tả chi tiết...',
        icon: AlignLeft,
        defaultLabel: 'Ghi chú / Mô tả',
        defaultPlaceholder: 'Nhập nội dung chi tiết...',
      },
    ],
  },
  {
    groupName: 'Số & Lựa chọn',
    items: [
      {
        type: 'number',
        label: 'Số / Số tiền',
        description: 'Chi phí, số lượng, định mức...',
        icon: Hash,
        defaultLabel: 'Số lượng / Chi phí',
        defaultPlaceholder: '0',
      },
      {
        type: 'select',
        label: 'Chọn một (Dropdown)',
        description: 'Phòng ban, mức độ ưu tiên...',
        icon: List,
        defaultLabel: 'Chọn một mục',
      },
      {
        type: 'multiselect',
        label: 'Chọn nhiều mục',
        description: 'Danh sách kỹ năng, thiết bị...',
        icon: CheckSquare,
        defaultLabel: 'Chọn danh sách',
      },
      {
        type: 'boolean',
        label: 'Công tắc Đúng / Sai',
        description: 'Xác nhận, khẩn cấp, cam kết...',
        icon: ToggleLeft,
        defaultLabel: 'Yêu cầu khẩn cấp',
      },
    ],
  },
  {
    groupName: 'Thời gian & Tệp đính kèm',
    items: [
      {
        type: 'date',
        label: 'Ngày tháng',
        description: 'Ngày bắt đầu, hạn chót...',
        icon: Calendar,
        defaultLabel: 'Ngày áp dụng',
      },
      {
        type: 'datetime',
        label: 'Ngày và Giờ',
        description: 'Thời điểm cụ thể trong ngày...',
        icon: Clock,
        defaultLabel: 'Thời gian diễn ra',
      },
      {
        type: 'file',
        label: 'Tệp đính kèm',
        description: 'Tài liệu, hóa đơn, chứng từ PDF...',
        icon: Paperclip,
        defaultLabel: 'Đính kèm tài liệu',
      },
    ],
  },
];

interface FieldPaletteProps {
  onAddField: (item: { type: FormFieldType; defaultLabel: string; defaultPlaceholder?: string }) => void;
}

export default function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Danh mục Trường (Palette)
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Nhấp chuột để thêm trường vào biểu mẫu
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.groupName}>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              {group.groupName}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() =>
                      onAddField({
                        type: item.type,
                        defaultLabel: item.defaultLabel,
                        defaultPlaceholder: item.defaultPlaceholder,
                      })
                    }
                    className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all group cursor-pointer"
                  >
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-primary transition-colors">
                          {item.label}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
