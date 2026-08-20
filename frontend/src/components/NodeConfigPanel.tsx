import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Node } from '@xyflow/react';
import { useState } from 'react';
import DynamicValueField from './DynamicValueField';
import AssigneeResolver, { type AssigneeResolverConfig } from './AssigneeResolver';
import FormBuilderModal, { type FormField } from './FormBuilderModal';
import ConditionBuilderModal from './ConditionBuilderModal';
import { CheckCircle2, UserPlus, BellRing, GitBranch, MousePointer2, FormInput, Eye, Code2, Database, Globe2, Play, Clock, Webhook } from 'lucide-react';
import clsx from 'clsx';
import { useDesignerStore } from '../stores/designerStore';
import type { TriggerType } from '../types/workflow';

const TRIGGER_TYPE_OPTIONS: { value: TriggerType; label: string; icon: any }[] = [
  { value: 'manual', label: 'Kích hoạt thủ công', icon: MousePointer2 },
  { value: 'schedule', label: 'Theo lịch trình', icon: Clock },
  { value: 'form', label: 'Khi gửi biểu mẫu', icon: FormInput },
  { value: 'webhook', label: 'Theo sự kiện Webhook', icon: Webhook },
];

const MOCK_FORMS = [
  { id: 'FORM-001', name: 'Yêu cầu nghỉ phép' },
  { id: 'FORM-002', name: 'Yêu cầu mua sắm' },
  { id: 'FORM-003', name: 'Đánh giá rủi ro CNTT' },
  { id: 'FORM-004', name: 'PC Request Form' },
];

const INITIATOR_ROLES = ['HR', 'Manager', 'Finance', 'Everyone'];

const nodeConfig: Record<string, { title: string, desc: string, icon: any, color: string }> = {
  start: { title: 'TRIGGER', desc: 'Bắt đầu workflow', icon: MousePointer2, color: 'text-indigo-500' },
  approval: { title: 'PHÊ DUYỆT', desc: 'Gửi yêu cầu và chờ phê duyệt', icon: CheckCircle2, color: 'text-blue-500' },
  review: { title: 'KIỂM DUYỆT', desc: 'Đánh giá nội dung và đưa ra quyết định', icon: Eye, color: 'text-purple-500' },
  assignment: { title: 'PHÂN CÔNG', desc: 'Giao nhiệm vụ cho cá nhân/nhóm', icon: UserPlus, color: 'text-orange-500' },
  condition: { title: 'ĐIỀU KIỆN (IF/ELSE)', desc: 'Chuyển hướng theo điều kiện', icon: GitBranch, color: 'text-emerald-500' },
  notification: { title: 'THÔNG BÁO', desc: 'Gửi thông báo tự động', icon: BellRing, color: 'text-yellow-500' },
  system: { title: 'SYSTEM ACTION', desc: 'Tự động gọi API, tạo record, cập nhật trạng thái', icon: Code2, color: 'text-gray-500' },
  data: { title: 'BẢNG DỮ LIỆU', desc: 'Truy vấn và xử lý dữ liệu có cấu trúc', icon: Database, color: 'text-teal-500' },
  http: { title: 'HTTP REQUEST', desc: 'Gọi API bên ngoài', icon: Globe2, color: 'text-cyan-500' },
  form: { title: 'BIỂU MẪU', desc: 'Yêu cầu người dùng nhập thông tin qua giao diện', icon: FormInput, color: 'text-pink-500' },
  end: { title: 'KẾT THÚC', desc: 'Kết thúc luồng xử lý', icon: Play, color: 'text-red-500' },
};

const defaultAssignee: AssigneeResolverConfig = { type: 'fixed', value: '', label: '' };

export default function NodeConfigPanel({ node, onClose, onUpdate }: { node: Node, onClose: () => void, onUpdate: (data: any) => void }) {
  const data = node.data as any;
  const type = data.nodeType as string;
  const config = nodeConfig[type] || { title: type.toUpperCase(), desc: 'Cấu hình node', icon: MousePointer2, color: 'text-gray-500' };
  const Icon = config.icon;

  const [activeTab, setActiveTab] = useState<'input' | 'config' | 'preview'>('config');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [conditionModalOpen, setConditionModalOpen] = useState(false);

  const setStoreTrigger = useDesignerStore(s => s.setTrigger);
  const setPanel = useDesignerStore(s => s.setPanel);

  const openTriggerLibrary = () => {
    setPanel('trigger-library');
  };

  const triggerType: TriggerType = (data.triggerType as TriggerType) || 'manual';
  const triggerConfig = (data.triggerConfig as Record<string, unknown>) || {};

  const changeTriggerType = (t: TriggerType) => {
    onUpdate({ triggerType: t, triggerConfig: {} });
    setStoreTrigger({ type: t, config: {} });
  };

  const updateTriggerConfig = (patch: Record<string, unknown>) => {
    const next = { ...triggerConfig, ...patch };
    onUpdate({ triggerConfig: next });
    setStoreTrigger({ type: triggerType, config: next });
  };

  const assignee: AssigneeResolverConfig = data.assignee || defaultAssignee;
  const setAssignee = (a: AssigneeResolverConfig) => onUpdate({ assignee: a });

  const formFields: FormField[] = data.formFields || [];
  const setFormFields = (fields: FormField[]) => {
    onUpdate({
      formFields: fields,
      subLabel: `${fields.length} trường`,
    });
  };

  const conditionExpression: string = data.condition || '';
  const setConditionExpression = (expr: string) => onUpdate({ condition: expr });

  const channels: string[] = data.channels || ['email', 'inapp'];

  return (
    <div className="w-[420px] border-l border-border bg-white flex flex-col h-full z-20 shadow-xl shrink-0 absolute right-0 top-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded bg-white border border-gray-200 shadow-sm flex items-center justify-center ${config.color}`}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy leading-none mb-1">{config.title}</h2>
            <p className="text-[10px] text-muted">{config.desc}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-navy hover:bg-gray-200 rounded transition-colors" aria-label="Đóng">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex px-4 border-b border-border">
        {['Dữ liệu đầu vào', 'Cấu hình', 'Xem trước'].map((tab, i) => {
          const keys = ['input', 'config', 'preview'];
          const active = activeTab === keys[i];
          return (
            <button
              key={keys[i]}
              onClick={() => setActiveTab(keys[i] as any)}
              className={clsx(
                "px-3 py-3 text-xs font-semibold uppercase tracking-wider relative transition-colors flex-1 text-center whitespace-nowrap",
                active ? "text-primary" : "text-gray-500 hover:text-navy"
              )}
            >
              {tab}
              {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'config' && (
          <div className="space-y-6">

            <div>
              <label className="block text-xs font-bold text-navy uppercase mb-1.5">Tên bước</label>
              <input
                type="text"
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={data.label as string}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>

            {type === 'start' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy uppercase">Loại Trigger</label>
                  <button
                    onClick={openTriggerLibrary}
                    className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    Mở Trigger Library
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => changeTriggerType(opt.value)}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm text-left transition-colors',
                          triggerType === opt.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border bg-white text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <Icon size={15} className={triggerType === opt.value ? 'text-primary' : 'text-gray-400'} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <label className="block text-xs font-bold text-navy uppercase">Cấu hình trigger</label>
                  {triggerType === 'manual' && (
                    <p className="text-xs text-muted bg-gray-50 border border-border rounded p-3">
                      Workflow được khởi chạy thủ công hoặc qua API manual action. Không cần cấu hình thêm.
                    </p>
                  )}
                  {triggerType === 'schedule' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Tần suất</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.frequency || 'Hàng ngày')}
                          onChange={e => updateTriggerConfig({ frequency: e.target.value })}
                        >
                          <option>Hàng ngày</option>
                          <option>Hàng tuần</option>
                          <option>Theo khoảng thời gian</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Giờ chạy</span>
                        <input
                          type="time"
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.time || '08:30')}
                          onChange={e => updateTriggerConfig({ time: e.target.value })}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Múi giờ</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.timezone || 'Asia/Ho_Chi_Minh')}
                          onChange={e => updateTriggerConfig({ timezone: e.target.value })}
                        >
                          <option>Asia/Ho_Chi_Minh</option>
                          <option>UTC</option>
                          <option>Asia/Singapore</option>
                        </select>
                      </div>
                    </>
                  )}
                  {triggerType === 'form' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Biểu mẫu kết nối</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.formId || '')}
                          onChange={e => updateTriggerConfig({ formId: e.target.value })}
                        >
                          <option value="">Chọn biểu mẫu...</option>
                          {MOCK_FORMS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Người được phép khởi tạo (Allowed Initiator)</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String((triggerConfig.allowedInitiator as any)?.role ?? 'HR')}
                          onChange={e => updateTriggerConfig({ allowedInitiator: { type: 'ROLE', role: e.target.value } })}
                        >
                          {INITIATOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Participant (field trong form)</span>
                        <input
                          type="text"
                          className="w-full border border-border rounded px-3 py-2 text-sm font-mono"
                          value={String(triggerConfig.participantField || '')}
                          placeholder="employeeId"
                          onChange={e => updateTriggerConfig({ participantField: e.target.value })}
                        />
                        <p className="text-[11px] text-muted mt-1 italic">
                          Resolve: Participant = {'${form.' + (String(triggerConfig.participantField || 'employeeId')) + '}'} — HR chọn ai, instance chạy cho người đó.
                        </p>
                      </div>
                    </>
                  )}
                  {triggerType === 'webhook' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Webhook Endpoint</span>
                        <input
                          readOnly
                          value={String(triggerConfig.endpoint || `https://api.workflow-builder.local/webhooks/${node.id}`)}
                          className="w-full border border-border rounded px-3 py-2 text-sm font-mono bg-gray-50 text-gray-600"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Xác thực</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.auth || 'API Key')}
                          onChange={e => updateTriggerConfig({ auth: e.target.value })}
                        >
                          <option>API Key</option>
                          <option>OAuth 2.0</option>
                          <option>Không xác thực</option>
                        </select>
                      </div>
                      <p className="text-xs text-muted bg-gray-50 border border-border rounded p-3">
                        Payload nhận từ hệ thống ngoài sẽ được normalize thành trigger.body và sẵn sàng cho Context Picker.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {(type === 'assignment' || type === 'approval' || type === 'review') && (
              <>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Người nhận/Phê duyệt</label>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Chi tiết công việc / Yêu cầu</label>
                  <div className="space-y-3">
                    <DynamicValueField
                      value={data.title || ''}
                      onChange={(val) => onUpdate({ title: val, subLabel: typeof val === 'string' ? val : '' })}
                      placeholder="Tiêu đề công việc"
                      label="Tiêu đề"
                    />
                    <textarea
                      rows={3}
                      placeholder="Mô tả"
                      className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                      value={data.description || ''}
                      onChange={(e) => onUpdate({ description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Kênh thông báo</label>
                  <div className="flex gap-4">
                    {(['email', 'inapp'] as const).map(ch => (
                      <label key={ch} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={channels.includes(ch)}
                          onChange={(e) => {
                            const next = e.target.checked ? [...channels, ch] : channels.filter(c => c !== ch);
                            onUpdate({ channels: next });
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{ch === 'email' ? 'Email' : 'In-app'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Chế độ thực thi</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="executionMode"
                        checked={data.executionMode !== 'forEachParticipant'}
                        onChange={() => onUpdate({ executionMode: 'single' })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">Task đơn lẻ</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="executionMode"
                        checked={data.executionMode === 'forEachParticipant'}
                        onChange={() => onUpdate({ executionMode: 'forEachParticipant' })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">For each participant</span>
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Chọn "For each participant" để tạo task cho từng participant trong participant scope.</p>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Biểu mẫu gắn với bước</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tên biểu mẫu (vd: Phiếu tự đánh giá)"
                        className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                        value={String(data.formName || '')}
                        onChange={e => onUpdate({ formName: e.target.value })}
                      />
                      <button
                        onClick={() => setFormModalOpen(true)}
                        className="px-3 py-2 border border-border rounded-md text-sm font-medium text-primary hover:bg-primary/5 flex items-center gap-1.5 shrink-0"
                      >
                        <FormInput size={15} />
                        {formFields.length > 0 ? `Chỉnh sửa (${formFields.length} trường)` : 'Thiết lập biểu mẫu'}
                      </button>
                    </div>
                    {formFields.length > 0 && (
                      <div className="border border-border rounded-md divide-y divide-gray-100">
                        {formFields.map(f => (
                          <div key={f.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                            <span className="text-navy font-medium">{f.label}</span>
                            <span className="text-muted text-xs">
                              {f.type}
                              {f.required ? ' · bắt buộc' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted">
                      Form fields được map vào Workflow Context (keys ổn định) để dùng trong điều kiện và thông báo.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Thông báo khi quá hạn</label>
                  <DynamicValueField
                    value={data.dueReminderMessage || ''}
                    onChange={(val) => onUpdate({ dueReminderMessage: val })}
                    placeholder="Nội dung nhắc nhở khi quá hạn"
                    label="Nhắc quá hạn"
                  />
                </div>
              </>
            )}

            {type === 'approval' && (
              <div className="pt-4 border-t border-border">
                <label className="block text-xs font-bold text-navy uppercase mb-1.5 flex items-center justify-between">
                  SLA & Chuyển cấp
                  <span className="text-primary cursor-pointer font-normal normal-case hover:underline">Thiết lập hạn chót phê duyệt</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-xs text-muted block mb-1">Hạn sau</span>
                    <select
                      className="w-full border border-border rounded px-3 py-1.5 text-sm"
                      value={data.slaDue || '24 giờ'}
                      onChange={(e) => onUpdate({ slaDue: e.target.value })}
                    >
                      <option>5 giờ</option>
                      <option>24 giờ</option>
                      <option>48 giờ</option>
                      <option>1 tuần</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-xs text-muted block mb-1">Xử lý khi quá hạn</span>
                    <select
                      className="w-full border border-border rounded px-3 py-1.5 text-sm"
                      value={data.slaAction || 'Nhắc nhở'}
                      onChange={(e) => onUpdate({ slaAction: e.target.value })}
                    >
                      <option>Nhắc nhở</option>
                      <option>Chuyển cấp</option>
                      <option>Tự động từ chối</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {type === 'notification' && (
              <div className="space-y-4">
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Người nhận</label>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Nội dung thông báo</label>
                  <DynamicValueField
                    value={data.message || ''}
                    onChange={(val) => onUpdate({ message: val })}
                    placeholder="Nhập nội dung..."
                    label="Nội dung"
                  />
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Kênh thông báo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['email', 'inapp', 'teams', 'webhook'] as const).map(ch => (
                      <label key={ch} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={channels.includes(ch)}
                          onChange={(e) => {
                            const next = e.target.checked ? [...channels, ch] : channels.filter(c => c !== ch);
                            onUpdate({ channels: next });
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm">{ch === 'email' ? 'Email' : ch === 'inapp' ? 'In-app' : ch === 'teams' ? 'Teams' : 'Webhook'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {type === 'system' && (
              <div className="pt-4 border-t border-border">
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">Hành động</label>
                <select
                  className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  value={data.action || 'Tạo record'}
                  onChange={(e) => onUpdate({ action: e.target.value })}
                >
                  <option>Tạo record</option>
                  <option>Cập nhật trạng thái</option>
                  <option>Gọi API nội bộ</option>
                </select>
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Endpoint/Connector</label>
                  <input
                    placeholder="Tên connector hoặc URL API"
                    value={data.endpoint || ''}
                    onChange={(e) => onUpdate({ endpoint: e.target.value })}
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Input Mapping</label>
                  <DynamicValueField
                    value={data.inputMapping || ''}
                    onChange={(val) => onUpdate({ inputMapping: val })}
                    placeholder="Map context fields..."
                    label="Input"
                  />
                </div>
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Output Mapping</label>
                  <DynamicValueField
                    value={data.outputMapping || ''}
                    onChange={(val) => onUpdate({ outputMapping: val })}
                    placeholder="Map response to context"
                    label="Output"
                  />
                </div>
              </div>
            )}

            {type === 'data' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Nguồn dữ liệu</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    value={data.dataSource || 'Biến workflow'}
                    onChange={(e) => onUpdate({ dataSource: e.target.value })}
                  >
                    <option>Biến workflow</option>
                    <option>Kết quả node trước</option>
                    <option>HTTP Response</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Bộ lọc</label>
                  <DynamicValueField
                    value={data.filterRules || ''}
                    onChange={(val) => onUpdate({ filterRules: val })}
                    placeholder="Điều kiện lọc dữ liệu"
                    label="Filter"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Preview</label>
                  <button className="w-full py-2 text-sm text-primary hover:text-primary-dark">Xem preview</button>
                </div>
              </div>
            )}

            {type === 'http' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1.5">Method</label>
                    <select
                      className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={data.method || 'GET'}
                      onChange={(e) => onUpdate({ method: e.target.value })}
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1.5">Auth</label>
                    <select
                      className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={data.auth || 'None'}
                      onChange={(e) => onUpdate({ auth: e.target.value })}
                    >
                      <option>None</option>
                      <option>API Key</option>
                      <option>OAuth 2.0</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">URL</label>
                  <DynamicValueField
                    value={data.url || ''}
                    onChange={(val) => onUpdate({ url: val })}
                    placeholder="https://api.example.com/..."
                    label="Endpoint"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Headers</label>
                  <DynamicValueField
                    value={data.headers || ''}
                    onChange={(val) => onUpdate({ headers: val })}
                    placeholder="Key-Value pairs"
                    label="Headers"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Body</label>
                  <DynamicValueField
                    value={data.body || ''}
                    onChange={(val) => onUpdate({ body: val })}
                    placeholder="JSON body"
                    label="Body"
                  />
                </div>
                <div>
                  <button
                    onClick={() => { /* test request */ }}
                    className="w-full py-2 text-sm text-primary hover:text-primary-dark border border-primary/30 rounded hover:bg-primary/5"
                  >
                    Test Request
                  </button>
                </div>
              </div>
            )}

            {type === 'form' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Biểu mẫu nhập liệu</label>
                  <button
                    onClick={() => setFormModalOpen(true)}
                    className="w-full border border-primary/30 bg-primary/5 rounded px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
                  >
                    <FormInput size={15} />
                    {formFields.length > 0 ? `Chỉnh sửa (${formFields.length} trường)` : 'Thiết lập biểu mẫu'}
                  </button>
                  {formFields.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {formFields.map(f => (
                        <li key={f.id} className="text-xs text-muted flex items-center gap-2 bg-gray-50 border border-border rounded px-2 py-1.5">
                          <span className="font-mono text-primary">{f.id}</span>
                          <span className="flex-1 truncate">{f.label}</span>
                          <span className="text-gray-400">{f.type}{f.required ? ' *' : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Submit Mapping</label>
                  <DynamicValueField
                    value={data.submitMapping || ''}
                    onChange={(val) => onUpdate({ submitMapping: val })}
                    placeholder="Map form values to context keys"
                    label="Mapping"
                  />
                </div>
                <div className="pt-3 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Chính sách xử lý khi hết hạn</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    value={data.expiryPolicy || 'Nhắc nhở'}
                    onChange={(e) => onUpdate({ expiryPolicy: e.target.value })}
                  >
                    <option>Nhắc nhở</option>
                    <option>Chuyển cấp</option>
                    <option>Tự động kết thúc</option>
                  </select>
                </div>
              </div>
            )}

            {type === 'condition' && (
              <>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Điều kiện</label>
                  <button
                    onClick={() => setConditionModalOpen(true)}
                    className="w-full border border-primary/30 bg-primary/5 rounded px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 flex items-center justify-center gap-2"
                  >
                    <GitBranch size={15} />
                    {conditionExpression ? 'Chỉnh sửa điều kiện' : 'Thiết lập điều kiện'}
                  </button>
                  {conditionExpression && (
                    <code className="mt-2 block bg-gray-50 border border-border rounded px-3 py-2 text-xs font-mono text-navy whitespace-pre-wrap">
                      {conditionExpression}
                    </code>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Nhánh TRUE đi tiếp theo, nhánh FALSE nếu không khớp. Bắt buộc có 2 đường đi (TRUE/FALSE).
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'input' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted">
            <MousePointer2 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Chọn nguồn dữ liệu đầu vào<br />từ Context Explorer</p>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">Chưa có kết quả để hiển thị</p>
          </div>
        )}
      </div>

      <FormBuilderModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSave={setFormFields}
        initialFields={formFields}
      />
      <ConditionBuilderModal
        isOpen={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        expression={conditionExpression}
        onSave={setConditionExpression}
      />
    </div>
  );
}