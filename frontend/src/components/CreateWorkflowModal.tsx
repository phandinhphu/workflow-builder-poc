import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowTemplates, orgUsers, getCurrentUser, resolveParticipantScope } from '../data/mockData';
import type { ParticipantScope, ParticipantNotification } from '../types/workflow';

export default function CreateWorkflowModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateFromUrl = searchParams.get('template');
  const [createType, setCreateType] = useState<'blank' | 'template'>('blank');
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState({
    templateId: templateFromUrl || '',
    name: `${currentUser.name} - Phê duyệt nghỉ phép`,
    description: '',
    type: 'Approval',
    module: 'Operations',
    owner: currentUser.id,
    version: '1.0',
    executionPattern: 'ON_DEMAND' as 'ON_DEMAND' | 'BATCH_CAMPAIGN',
  });
  const [participantScope, setParticipantScope] = useState<ParticipantScope>({
    enabled: false,
    source: 'ORGANIZATION_DIRECTORY',
    scopeKind: 'all_active',
    selectorType: 'fixed',
    selectorConfig: { rule: 'employee.status == ACTIVE' },
    snapshotPolicy: 'AT_INSTANCE_START',
  });
  const [participantNotification, setParticipantNotification] = useState<ParticipantNotification>({
    enabled: false,
    channels: ['inapp', 'email'],
    titleTemplate: 'Đợt đánh giá {{workflow.period}} đã bắt đầu',
    bodyTemplate: 'Bạn là người tham gia đợt đánh giá {{workflow.period}}. Thời gian hoàn thành: {{workflow.dueDate}}',
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
      executionPattern: formData.executionPattern,
      participantScope,
      participantNotification,
    };
    if (createType === 'template' && formData.templateId) {
      navigate(`/workflows/new/designer?template=${formData.templateId}`, { state });
    } else {
      navigate('/workflows/new/designer', { state });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-navy">Tạo workflow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">Thông tin cơ bản</h3>
            
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="createType" 
                  checked={createType === 'blank'} 
                  onChange={() => setCreateType('blank')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="text-sm font-medium">Tạo từ workflow trống</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="createType" 
                  checked={createType === 'template'} 
                  onChange={() => setCreateType('template')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="text-sm font-medium">Template</span>
              </label>
            </div>

            <form id="create-workflow-form" onSubmit={handleCreate} className="space-y-5">
              {createType === 'template' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn Template <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Chọn template...</option>
                    {workflowTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên workflow <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea 
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Nhập mô tả cho workflow..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại workflow <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option>Approval</option>
                    <option>Review</option>
                    <option>Assignment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>
                  <select 
                    name="module"
                    value={formData.module}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option>Operations</option>
                    <option>HR</option>
                    <option>Finance</option>
                  </select>
                </div>
              </div>

              {/* Execution Pattern Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô hình vận hành (Execution Pattern) <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setFormData(prev => ({ ...prev, executionPattern: 'ON_DEMAND' }))}
                    className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.executionPattern === 'ON_DEMAND'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="executionPattern"
                        checked={formData.executionPattern === 'ON_DEMAND'}
                        onChange={() => setFormData(prev => ({ ...prev, executionPattern: 'ON_DEMAND' }))}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-gray-900">Theo yêu cầu (On-Demand)</span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 pl-5">
                      Đăng ký Service Catalog. Từng nhân viên gửi yêu cầu độc lập (Nghỉ phép, Mua sắm, Đăng ký dịch vụ).
                    </p>
                  </div>

                  <div
                    onClick={() => setFormData(prev => ({ ...prev, executionPattern: 'BATCH_CAMPAIGN' }))}
                    className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.executionPattern === 'BATCH_CAMPAIGN'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="executionPattern"
                        checked={formData.executionPattern === 'BATCH_CAMPAIGN'}
                        onChange={() => setFormData(prev => ({ ...prev, executionPattern: 'BATCH_CAMPAIGN' }))}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold text-gray-900">Chiến dịch định kỳ (Batch)</span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 pl-5">
                      Đợt đánh giá nhân sự, khảo sát 360, kiểm kê định kỳ với tập người tham gia (Participant Scope).
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">Quyền sở hữu & Phiên bản</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Người sở hữu <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        name="owner"
                        required
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-10"
                      >
                        {orgUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.displayName}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">NB</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phiên bản
                    </label>
                    <input 
                      type="text" 
                      value="1.0"
                      disabled
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {formData.executionPattern === 'ON_DEMAND' ? (
                <div className="pt-4 mt-2 border-t border-gray-100">
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-4 text-sm text-indigo-900">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Mô hình Theo yêu cầu (On-Demand)
                    </div>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Workflow này sẽ được đăng ký vào <strong>Service Catalog</strong>. Mỗi nhân viên khi bấm "Tạo yêu cầu" sẽ là người thực hiện (Participant) độc lập cho phiên chạy đó. Không cần cấu hình tập đối tượng tham gia trước.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pt-4 mt-2">
                    <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">ĐỐI TƯỢNG THAM GIA</h3>

                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participantScope.enabled}
                        onChange={e => setParticipantScope({ ...participantScope, enabled: e.target.checked })}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Workflow có tập đối tượng tham gia (participant scope)</span>
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn đối tượng</label>
                        <select
                          disabled={!participantScope.enabled}
                          value={participantScope.source}
                          onChange={e => setParticipantScope({ ...participantScope, source: e.target.value as any })}
                          className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="ORGANIZATION_DIRECTORY">Tổ chức / Nhân sự</option>
                          <option value="EXTERNAL">Nguồn bên ngoài</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi</label>
                        <select
                          disabled={!participantScope.enabled}
                          value={participantScope.scopeKind}
                          onChange={e => setParticipantScope({ ...participantScope, scopeKind: e.target.value as any })}
                          className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="all_active">Tất cả nhân viên đang hoạt động</option>
                          <option value="department">Theo phòng ban</option>
                          <option value="role">Theo vai trò</option>
                          <option value="fixed_users">Chọn người cụ thể</option>
                          <option value="from_trigger">Từ dữ liệu Trigger (form)</option>
                          <option value="condition">Theo điều kiện động (rule)</option>
                        </select>
                      </div>
                    </div>

                    {participantScope.enabled && participantScope.scopeKind === 'from_trigger' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Field trong trigger chứa participant</label>
                        <input
                          type="text"
                          value={participantScope.selectorConfig.triggerField ?? ''}
                          onChange={e => setParticipantScope({ ...participantScope, selectorConfig: { ...participantScope.selectorConfig, triggerField: e.target.value } })}
                          placeholder="employeeId"
                          className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[11px] text-muted mt-1 italic">Participant = {'${trigger.body.' + (participantScope.selectorConfig.triggerField ?? 'employeeId') + '}'} — HR chọn ai, instance chạy cho người đó.</p>
                      </div>
                    )}

                    {participantScope.enabled && participantScope.scopeKind === 'condition' && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Điều kiện rule</label>
                        <input
                          type="text"
                          value={participantScope.selectorConfig.rule ?? ''}
                          onChange={e => setParticipantScope({ ...participantScope, selectorConfig: { ...participantScope.selectorConfig, rule: e.target.value } })}
                          placeholder="employee.status == ACTIVE"
                          className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[11px] text-muted mt-1 italic">Rule được resolve mỗi khi instance bắt đầu — tháng sau có thêm người, instance tháng sau tự có thêm participant.</p>
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chính sách snapshot</label>
                      <select
                        disabled={!participantScope.enabled}
                        value={participantScope.snapshotPolicy}
                        onChange={e => setParticipantScope({ ...participantScope, snapshotPolicy: e.target.value as any })}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="AT_INSTANCE_START">Chốt danh sách khi workflow bắt đầu (khuyến nghị)</option>
                        <option value="LIVE_REFRESH">Resolve động mỗi khi cần participant</option>
                      </select>
                    </div>

                    {participantScope.enabled && (
                      <div className="mt-3 bg-gray-50 border border-border rounded-md p-3 text-sm text-gray-600">
                        {participantScope.scopeKind === 'from_trigger'
                          ? <>Khi instance bắt đầu: resolve participant từ <strong className="text-navy font-mono">${'{trigger.body.' + (participantScope.selectorConfig.triggerField ?? 'employeeId') + '}'}</strong> → chốt snapshot → tạo instance → thông báo cho participant.</>
                          : <>Khi instance bắt đầu: resolve <strong className="text-navy">{resolveParticipantScope(participantScope).length} người</strong> → chốt snapshot → tạo instance → thông báo cho từng participant.</>}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2">
                    <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">THÔNG BÁO NGƯỜI THAM GIA</h3>

                    <label className="flex items-center gap-2 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={participantNotification.enabled}
                        onChange={e => setParticipantNotification({ ...participantNotification, enabled: e.target.checked })}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Thông báo cho người tham gia khi đợt workflow bắt đầu</span>
                    </label>

                    <div className="flex gap-4 mb-3">
                      {(['inapp', 'email', 'teams'] as const).map(ch => (
                        <label key={ch} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            disabled={!participantNotification.enabled}
                            checked={participantNotification.channels.includes(ch)}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...participantNotification.channels, ch]
                                : participantNotification.channels.filter(c => c !== ch);
                              setParticipantNotification({ ...participantNotification, channels: next });
                            }}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          {ch === 'inapp' ? 'In-app' : ch === 'email' ? 'Email' : 'Teams'}
                        </label>
                      ))}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                      <input
                        type="text"
                        disabled={!participantNotification.enabled}
                        value={participantNotification.titleTemplate}
                        onChange={e => setParticipantNotification({ ...participantNotification, titleTemplate: e.target.value })}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                      <textarea
                        rows={2}
                        disabled={!participantNotification.enabled}
                        value={participantNotification.bodyTemplate}
                        onChange={e => setParticipantNotification({ ...participantNotification, bodyTemplate: e.target.value })}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button 
            type="submit" 
            form="create-workflow-form"
            className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark"
          >
            Tạo Workflow
          </button>
        </div>

      </div>
    </div>
  );
}