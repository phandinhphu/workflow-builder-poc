import { XMarkIcon } from '@heroicons/react/24/outline';
import { MousePointer2, Clock, FileText, Webhook } from 'lucide-react';

const TRIGGERS = [
  { type: 'manual', label: 'Kích hoạt thủ công', description: 'Bắt đầu workflow thủ công hoặc gọi API', icon: MousePointer2 },
  { type: 'schedule', label: 'Theo lịch trình', description: 'Chạy vào các thời điểm cụ thể, hàng ngày, hàng tuần hoặc theo khoảng thời gian tùy', icon: Clock },
  { type: 'form', label: 'Khi gửi biểu mẫu', description: 'Kích hoạt khi người dùng gửi một biểu mẫu đã kết nối', icon: FileText },
  { type: 'webhook', label: 'Theo sự kiện Webhook', description: 'Kích hoạt tự động khi nhận dữ liệu gửi từ ứng dụng bên ngoài qua URL API', icon: Webhook },
];

export default function TriggerLibraryPanel({ onClose }: { onClose: () => void }) {
  const onDragStart = (event: React.DragEvent, type: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', 'start');
    event.dataTransfer.setData('application/triggerType', type);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 border-r border-border bg-white flex flex-col h-full z-10 shadow-sm relative shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/50">
        <div>
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <MousePointer2 size={14} />
            </div>
            TRIGGERS
          </h2>
          <p className="text-xs text-muted mt-1">Lựa chọn sự kiện kích hoạt workflow</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-navy p-1 rounded-full hover:bg-gray-100 transition-colors">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {TRIGGERS.map(trigger => {
          const Icon = trigger.icon;
          return (
            <div 
              key={trigger.type}
              draggable
              onDragStart={(e) => onDragStart(e, trigger.type, trigger.label)}
              className="flex gap-3 p-3 border border-border rounded-lg bg-surface hover:border-primary hover:shadow-sm cursor-grab transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary text-gray-500 transition-colors">
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-navy leading-none mb-1.5 group-hover:text-primary transition-colors">{trigger.label}</h4>
                <p className="text-[11px] text-muted leading-snug line-clamp-2">{trigger.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
