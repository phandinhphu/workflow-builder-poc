import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowTemplates, orgUsers } from '../data/mockData';
import { useAuthStore } from '../stores/authStore';

export default function CreateWorkflowModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateFromUrl = searchParams.get('template');
  const [createType, setCreateType] = useState<'blank' | 'template'>(templateFromUrl ? 'template' : 'blank');
  const currentUser = useAuthStore((s) => s.currentUser);

  const [formData, setFormData] = useState({
    templateId: templateFromUrl || '',
    name: '',
    description: '',
    type: 'Approval',
    module: 'Operations',
    owner: currentUser?.id ?? (orgUsers[0]?.id || 'U000'),
    version: '1.0',
    executionPattern: 'ON_DEMAND',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    const state = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      module: formData.module,
      owner: formData.owner,
      executionPattern: 'ON_DEMAND',
      participantScope: {
        enabled: false,
        source: 'ORGANIZATION_DIRECTORY',
        scopeKind: 'all_active',
        selectorType: 'fixed',
        selectorConfig: { rule: 'employee.status == ACTIVE' },
        snapshotPolicy: 'AT_INSTANCE_START',
      },
      participantNotification: {
        enabled: false,
        channels: ['inapp', 'email'],
        titleTemplate: '',
        bodyTemplate: '',
      },
    };
    if (createType === 'template' && formData.templateId) {
      navigate(`/workflows/new/designer?template=${formData.templateId}`, { state });
    } else {
      navigate('/workflows/new/designer', { state });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-navy">Tạo mới Workflow</h2>
            <p className="text-xs text-muted mt-0.5">Thiết kế luồng quy trình nghiệp vụ tổng quát</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="create-workflow-form" onSubmit={handleCreate} className="space-y-4">
            {/* Template or Blank Choice */}
            <div className="flex gap-4 p-3 bg-gray-50/80 rounded-xl border border-gray-200/70">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="createType"
                  checked={createType === 'blank'}
                  onChange={() => setCreateType('blank')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Quy trình trống</span>
                  <span className="text-[11px] text-gray-500">Bắt đầu từ node Start & End cơ bản</span>
                </div>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer flex-1 border-l border-gray-200 pl-4">
                <input
                  type="radio"
                  name="createType"
                  checked={createType === 'template'}
                  onChange={() => setCreateType('template')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Dùng Template mẫu</span>
                  <span className="text-[11px] text-gray-500">Quy trình phê duyệt dựng sẵn</span>
                </div>
              </label>
            </div>

            {createType === 'template' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn Template mẫu <span className="text-danger">*</span>
                </label>
                <select
                  name="templateId"
                  required={createType === 'template'}
                  value={formData.templateId}
                  onChange={handleChange}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">Chọn template mẫu...</option>
                  {workflowTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tên workflow <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                autoFocus
                value={formData.name}
                onChange={handleChange}
                placeholder="Ví dụ: Quy trình phê duyệt mua sắm thiết bị, Xin tạm ứng công tác..."
                className="w-full border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả quy trình</label>
              <textarea
                name="description"
                rows={2}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Mô tả mục đích, phạm vi áp dụng của quy trình..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Loại quy trình <span className="text-danger">*</span>
                </label>
                <select
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="Approval">Phê duyệt (Approval)</option>
                  <option value="Review">Xem xét / Đánh giá (Review)</option>
                  <option value="Assignment">Phân công công việc (Task Assignment)</option>
                  <option value="Automation">Tự động hóa hệ thống (Automation)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phân loại bộ phận</label>
                <select
                  name="module"
                  value={formData.module}
                  onChange={handleChange}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="Operations">Vận hành (Operations)</option>
                  <option value="HR">Nhân sự (HR)</option>
                  <option value="Finance">Tài chính (Finance)</option>
                  <option value="IT">Công nghệ thông tin (IT)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Người phụ trách <span className="text-danger">*</span>
                </label>
                <select
                  name="owner"
                  required
                  value={formData.owner}
                  onChange={handleChange}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.jobTitle || 'Nhân viên'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phiên bản khởi tạo</label>
                <input
                  type="text"
                  value="1.0 (Bản nháp)"
                  disabled
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>

            {/* Banner Kiến trúc Gắn kết Độc lập */}
            <div className="pt-2">
              <div className="bg-indigo-50/80 border border-indigo-100/90 rounded-xl p-3.5 text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900 text-xs mb-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  Kiến trúc Phân rã Độc lập (Decoupled Binding Architecture)
                </div>
                <p className="text-[11px] text-indigo-800/90 leading-relaxed">
                  Quy trình được thiết kế độc lập với Biểu mẫu. Sau khi <strong>Xuất bản (Publish)</strong>, bạn có thể ghép nối quy trình này với bất kỳ <strong>Biểu mẫu (Form Version)</strong> nào thông qua <strong>Danh mục Ticket (Ticket Category)</strong> để nhân viên gửi yêu cầu.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-lg bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-workflow-form"
            className="px-5 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white text-xs font-bold shadow-sm transition-all"
          >
            Tiếp tục đến Trình vẽ quy trình →
          </button>
        </div>
      </div>
    </div>
  );
}
