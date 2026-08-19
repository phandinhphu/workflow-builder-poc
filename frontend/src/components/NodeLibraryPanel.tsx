import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  CheckCircle2, 
  Eye, 
  UserPlus, 
  BellRing, 
  Code2, 
  Database, 
  Globe2, 
  FormInput, 
  GitBranch 
} from 'lucide-react';

const NODE_CATEGORIES = [
  {
    name: 'NGHIỆP VỤ',
    nodes: [
      { type: 'approval', label: 'Phê duyệt', description: 'Gửi yêu cầu và chờ phê duyệt từ quản lý hoặc bên liên quan', icon: CheckCircle2 },
      { type: 'review', label: 'Kiểm duyệt', description: 'Kiểm duyệt nội dung trước khi tiếp tục', icon: Eye },
      { type: 'assignment', label: 'Phân công', description: 'Giao nhiệm vụ hoặc hồ sơ cho đội ngũ hoặc vai trò cụ thể', icon: UserPlus },
      { type: 'notification', label: 'Thông báo', description: 'Gửi thông báo tự động (Email, In-app, Slack) đến các người liên quan', icon: BellRing },
    ]
  },
  {
    name: 'CỐT LÕI',
    nodes: [
      { type: 'system', label: 'System Action', description: 'Thực thi hành động hệ thống: tạo record, cập nhật trạng thái, gọi API nội bộ', icon: Code2 },
      { type: 'data', label: 'Bảng dữ liệu', description: 'Truy vấn và xử lý dữ liệu có cấu trúc', icon: Database },
      { type: 'http', label: 'HTTP Request', description: 'Gửi yêu cầu gọi API bên ngoài', icon: Globe2 },
      { type: 'form', label: 'Biểu mẫu', description: 'Yêu cầu người dùng nhập thông tin qua giao diện', icon: FormInput },
    ]
  },
  {
    name: 'ĐIỀU KHIỂN LUỒNG XỬ LÝ',
    nodes: [
      { type: 'condition', label: 'Điều kiện (IF / ELSE)', description: 'Chuyển hướng luồng dữ liệu theo điều kiện', icon: GitBranch },
    ]
  }
];

export default function NodeLibraryPanel({ onClose }: { onClose: () => void }) {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 border-r border-border bg-white flex flex-col h-full z-10 shadow-sm relative shrink-0">
      <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/50">
        <div>
          <h2 className="text-base font-bold text-navy flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center">
              <span className="w-3 h-3 border-2 border-gray-600 rounded-sm"></span>
            </div>
            Thư viện
          </h2>
          <p className="text-xs text-muted mt-1">Lựa chọn node để thêm vào workflow</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-navy p-1 rounded-full hover:bg-gray-100 transition-colors">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {NODE_CATEGORIES.map(category => (
          <div key={category.name}>
            <h3 className="text-xs font-bold text-muted mb-3 flex items-center gap-2 tracking-wide">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
              {category.name}
            </h3>
            <div className="space-y-3">
              {category.nodes.map(node => {
                const Icon = node.icon;
                return (
                  <div 
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type, node.label)}
                    className="flex gap-3 p-3 border border-border rounded-lg bg-surface hover:border-primary hover:shadow-sm cursor-grab transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary text-gray-500 transition-colors">
                      <Icon size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-navy leading-none mb-1.5 group-hover:text-primary transition-colors">{node.label}</h4>
                      <p className="text-[11px] text-muted leading-snug line-clamp-2">{node.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
