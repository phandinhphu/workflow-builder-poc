import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, UsersIcon, CheckCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useDesignerStore } from '../stores/designerStore';
import { getWorkflowTypeOptions, getModuleOptions, orgUsers, resolveParticipantScope } from '../data/mockData';
import type { WorkflowVariable } from '../types/workflow';

interface WorkflowSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VAR_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'OBJECT', 'LIST'];

export default function WorkflowSettingsModal({ isOpen, onClose }: WorkflowSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'scope' | 'vars'>('info');
  const { workflowData, setWorkflowData, trigger, participantScope, setParticipantScope, participantNotification, setParticipantNotification, variables, setVariables } = useDesignerStore();

  const [newVarKey, setNewVarKey] = useState('');
  const [newVarType, setNewVarType] = useState('STRING');
  const [newVarDefault, setNewVarDefault] = useState('');
  const [newVarDesc, setNewVarDesc] = useState('');
  const [newVarRequired, setNewVarRequired] = useState(false);
  const [varError, setVarError] = useState('');

  const scopeEnabled = participantScope.enabled;
  const notificationEnabled = participantNotification.enabled;

  const triggerFieldOptions = Object.keys((trigger?.inputSchema as Record<string, unknown>) ?? {});

  const resolvedScopeUsers = resolveParticipantScope(participantScope);
  const previewFixedUsers = resolvedScopeUsers.slice(0, 5).map(u => u.displayName);
  const scopePreviewCount = resolvedScopeUsers.length;

  const addVariable = () => {
    const key = newVarKey.trim();
    if (!key) {
      setVarError('Chưa nhập key biến');
      return;
    }
    if (variables.some(v => v.key === key)) {
      setVarError(`Biến "${key}" đã tồn tại`);
      return;
    }
    const v: WorkflowVariable = {
      key,
      dataType: newVarType as WorkflowVariable['dataType'],
      defaultValue: newVarDefault ? { kind: 'CONSTANT', value: newVarDefault } : undefined,
      required: newVarRequired,
      description: newVarDesc || undefined,
    };
    setVariables([...variables, v]);
    setNewVarKey('');
    setNewVarDefault('');
    setNewVarDesc('');
    setNewVarRequired(false);
    setVarError('');
  };

  const removeVariable = (key: string) => {
    setVariables(variables.filter(v => v.key !== key));
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[85]" open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95"
            >
              <Dialog.Panel className="relative transform bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <Dialog.Title as="h2" className="text-xl font-bold text-navy">
                    Thiết lập workflow
                  </Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex border-b border-border px-6">
                  {[
                    { id: 'info', name: 'Thông tin chung' },
                    { id: 'scope', name: 'Đối tượng tham gia' },
                    { id: 'vars', name: 'Biến workflow' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={clsx(
                        "px-4 py-3 text-sm font-semibold transition-colors relative mr-4",
                        activeTab === tab.id ? "text-primary" : "text-gray-500 hover:text-navy"
                      )}
                    >
                      {tab.name}
                      {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 bg-page">

                  {activeTab === 'info' && (
                    <div className="space-y-5 bg-white p-5 rounded-lg border border-border shadow-sm">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tên workflow <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={workflowData.name || ''}
                          onChange={e => setWorkflowData({ name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea
                          rows={3}
                          className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          value={workflowData.description || ''}
                          onChange={e => setWorkflowData({ description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Loại workflow</label>
                          <select
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                            value={workflowData.type || ''}
                            onChange={e => setWorkflowData({ type: e.target.value })}
                          >
                            {getWorkflowTypeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                          <select
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                            value={workflowData.module || ''}
                            onChange={e => setWorkflowData({ module: e.target.value })}
                          >
                            {getModuleOptions().map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Người sở hữu</label>
                          <select
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                            value={workflowData.owner || ''}
                            onChange={e => setWorkflowData({ owner: e.target.value })}
                          >
                            {orgUsers.map(u => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phiên bản</label>
                          <input
                            type="text"
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
                            value={workflowData.version || ''}
                            onChange={e => setWorkflowData({ version: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'scope' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-lg border border-border shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <h3 className="text-sm font-bold text-navy">ĐỐI TƯỢNG THAM GIA</h3>
                            <p className="text-xs text-muted mt-0.5">Xác định tập hợp người tham gia vào luồng quy trình này (khác với Assignee của từng bước)</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={scopeEnabled}
                              onChange={e => setParticipantScope({ enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn đối tượng</label>
                          <select
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
                            value={participantScope.source}
                            onChange={e => setParticipantScope({ source: e.target.value as any })}
                            disabled={!scopeEnabled}
                          >
                            <option value="ORGANIZATION_DIRECTORY">Tổ chức / Nhân sự (Organization Directory)</option>
                            <option value="EXTERNAL">Nguồn bên ngoài (External)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phạm vi</label>
                          <div className="space-y-2">
                            {([
                              { kind: 'all_active', label: 'Tất cả nhân viên đang hoạt động' },
                              { kind: 'department', label: 'Theo phòng ban' },
                              { kind: 'role', label: 'Theo vai trò' },
                              { kind: 'fixed_users', label: 'Chọn người cụ thể' },
                              { kind: 'from_trigger', label: 'Từ dữ liệu Trigger (form)' },
                              { kind: 'condition', label: 'Theo điều kiện động (rule)' },
                            ] as const).map(opt => (
                              <label key={opt.kind} className={clsx(
                                "flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors",
                                participantScope.scopeKind === opt.kind ? "border-primary bg-primary/5" : "border-border hover:border-gray-300"
                              )}>
                                <input
                                  type="radio"
                                  name="scopeKind"
                                  className="mt-0.5 w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                  checked={participantScope.scopeKind === opt.kind}
                                  onChange={() => setParticipantScope({ scopeKind: opt.kind })}
                                  disabled={!scopeEnabled}
                                />
                                <span className="text-sm font-medium text-gray-800">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {scopeEnabled && participantScope.scopeKind === 'department' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                            <select
                              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                              value={participantScope.selectorConfig.department ?? ''}
                              onChange={e => setParticipantScope({ selectorConfig: { ...participantScope.selectorConfig, department: e.target.value } })}
                            >
                              <option value="">Chọn phòng ban...</option>
                              {Array.from(new Set(orgUsers.map(u => u.department))).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}

                        {scopeEnabled && participantScope.scopeKind === 'role' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                            <select
                              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                              value={participantScope.selectorConfig.role ?? ''}
                              onChange={e => setParticipantScope({ selectorConfig: { ...participantScope.selectorConfig, role: e.target.value } })}
                            >
                              <option value="">Chọn vai trò...</option>
                              {Array.from(new Set(orgUsers.map(u => u.role))).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                        )}

                        {scopeEnabled && participantScope.scopeKind === 'fixed_users' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Người tham gia cụ thể</label>
                            <div className="flex flex-wrap gap-2">
                              {orgUsers.map(u => {
                                const selected = participantScope.selectorConfig.userIds?.includes(u.id) ?? false;
                                return (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => setParticipantScope({
                                      selectorConfig: {
                                        ...participantScope.selectorConfig,
                                        userIds: selected
                                          ? (participantScope.selectorConfig.userIds ?? []).filter(id => id !== u.id)
                                          : [...(participantScope.selectorConfig.userIds ?? []), u.id],
                                      },
                                    })}
                                    className={clsx(
                                      "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                                      selected ? "border-primary bg-primary text-white" : "border-border bg-white text-gray-600 hover:border-primary"
                                    )}
                                  >
                                    {u.displayName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {scopeEnabled && participantScope.scopeKind === 'from_trigger' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Field trong trigger chứa participant</label>
                            <select
                              className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                              value={participantScope.selectorConfig.triggerField ?? ''}
                              onChange={e => setParticipantScope({ selectorConfig: { ...participantScope.selectorConfig, triggerField: e.target.value } })}
                            >
                              <option value="">Chọn field...</option>
                              {triggerFieldOptions.length > 0 ? triggerFieldOptions.map(f => <option key={f} value={f}>${'{trigger.body.'}{f}{'}'}</option>) : <option value="employeeId">${'{trigger.body.employeeId}'}</option>}
                            </select>
                            <p className="text-[11px] text-muted mt-1 italic">
                              Definition lưu rule <span className="font-mono">Participant = {'${trigger.body.' + (participantScope.selectorConfig.triggerField ?? 'employeeId') + '}'}</span> — runtime resolve thành người cụ thể. Lần sau HR chọn nhân viên khác, cùng definition tạo instance cho người đó.
                            </p>
                          </div>
                        )}

                        {scopeEnabled && participantScope.scopeKind === 'condition' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Điều kiện động <span className="text-muted font-normal">(rule được resolve mỗi khi instance bắt đầu)</span>
                            </label>
                            <textarea
                              rows={3}
                              className="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              placeholder={'Ví dụ:\nemployee.status == ACTIVE\nemployee.department == IT'}
                              value={participantScope.selectorConfig.rule ?? ''}
                              onChange={e => setParticipantScope({ selectorConfig: { ...participantScope.selectorConfig, rule: e.target.value } })}
                            />
                            <p className="text-[11px] text-muted mt-1 italic">
                              Tháng 8 có 100 người → instance tháng 8 có 100 participants; tháng 9 công ty có 107 người → instance tháng 9 tự resolve thành 107.
                            </p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Chính sách snapshot</label>
                          <div className="space-y-2">
                            <label className={clsx("flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors", participantScope.snapshotPolicy === 'AT_INSTANCE_START' ? "border-primary bg-primary/5" : "border-border hover:border-gray-300")}>
                              <input
                                type="radio"
                                name="snapshotPolicy"
                                className="mt-0.5 w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                checked={participantScope.snapshotPolicy === 'AT_INSTANCE_START'}
                                onChange={() => setParticipantScope({ snapshotPolicy: 'AT_INSTANCE_START' })}
                                disabled={!scopeEnabled}
                              />
                              <span className="text-sm">
                                <span className="font-medium text-gray-800">Chốt danh sách khi workflow bắt đầu</span>
                                <span className="block text-xs text-muted">Resolve một lần và lưu snapshot — lịch sử ổn định, dễ audit. Người mới vào giữa kỳ không bị nhét vào kỳ đang chạy.</span>
                              </span>
                            </label>
                            <label className={clsx("flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors", participantScope.snapshotPolicy === 'LIVE_REFRESH' ? "border-primary bg-primary/5" : "border-border hover:border-gray-300")}>
                              <input
                                type="radio"
                                name="snapshotPolicy"
                                className="mt-0.5 w-4 h-4 text-primary focus:ring-primary border-gray-300"
                                checked={participantScope.snapshotPolicy === 'LIVE_REFRESH'}
                                onChange={() => setParticipantScope({ snapshotPolicy: 'LIVE_REFRESH' })}
                                disabled={!scopeEnabled}
                              />
                              <span className="text-sm">
                                <span className="font-medium text-gray-800">Resolve động mỗi lần cần participant</span>
                                <span className="block text-xs text-muted">Danh sách luôn theo rule hiện tại — dùng khi cần phản ánh tổ chức theo thời gian thực.</span>
                              </span>
                            </label>
                          </div>
                        </div>

                        {scopeEnabled && (
                          <div className="bg-gray-50 rounded-md p-4 border border-border">
                            <h4 className="text-sm font-medium text-navy flex items-center gap-2 mb-3">
                              <UsersIcon className="w-4 h-4 text-primary" /> Kết quả xem trước
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              <CheckCircleIcon className="w-3 h-3 text-success" />
                              {participantScope.scopeKind === 'from_trigger' ? (
                                <span>
                                  Participant resolve từ <strong className="text-navy font-mono">${'{trigger.body.' + (participantScope.selectorConfig.triggerField ?? 'employeeId') + '}'}</strong> khi HR submit form — không cần biết trước là ai.
                                </span>
                              ) : (
                                <span><strong className="text-navy">{scopePreviewCount}</strong> người sẽ tham gia khi instance bắt đầu</span>
                              )}
                            </div>
                            {participantScope.scopeKind === 'from_trigger' ? (
                              <p className="text-sm text-gray-600 bg-white p-3 border border-border rounded">
                                Ví dụ: HR tạo yêu cầu cho <strong>Nguyễn Văn A</strong> → instance chạy cho Nguyễn Văn A. HR tạo cho Trần Văn B → instance chạy cho Trần Văn B. Không cần sửa workflow.
                              </p>
                            ) : (
                              <ul className="text-sm text-gray-700 space-y-1.5 list-disc list-inside bg-white p-3 border border-border rounded">
                                {previewFixedUsers.map((user, idx) => (
                                  <li key={idx}>{user}</li>
                                ))}
                                {scopePreviewCount > previewFixedUsers.length && (
                                  <li className="text-muted">...và {scopePreviewCount - previewFixedUsers.length} người khác</li>
                                )}
                              </ul>
                            )}
                            <p className="text-[11px] text-muted mt-3 italic">
                              * Đây là rule, không phải danh sách cố định. Danh sách thực tế được resolve và chốt tại thời điểm instance bắt đầu.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-5 rounded-lg border border-border shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                            <h3 className="text-sm font-bold text-navy">THÔNG BÁO NGƯỜI THAM GIA</h3>
                            <p className="text-xs text-muted mt-0.5">Thông báo cấp workflow khi đợt bắt đầu — khác với thông báo khi giao task cụ thể</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={notificationEnabled}
                              onChange={e => setParticipantNotification({ enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Kênh</label>
                          <div className="flex gap-4">
                            {([
                              { id: 'inapp', label: 'In-app' },
                              { id: 'email', label: 'Email' },
                              { id: 'teams', label: 'Teams' },
                            ] as const).map(ch => (
                              <label key={ch.id} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                                  checked={participantNotification.channels.includes(ch.id)}
                                  onChange={e => {
                                    const next = e.target.checked
                                      ? [...participantNotification.channels, ch.id]
                                      : participantNotification.channels.filter(c => c !== ch.id);
                                    setParticipantNotification({ channels: next });
                                  }}
                                  disabled={!notificationEnabled}
                                />
                                {ch.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                          <input
                            type="text"
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50 disabled:text-gray-400"
                            value={participantNotification.titleTemplate}
                            onChange={e => setParticipantNotification({ titleTemplate: e.target.value })}
                            disabled={!notificationEnabled}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                          <textarea
                            rows={3}
                            className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:bg-gray-50 disabled:text-gray-400"
                            value={participantNotification.bodyTemplate}
                            onChange={e => setParticipantNotification({ bodyTemplate: e.target.value })}
                            disabled={!notificationEnabled}
                          />
                          <p className="text-[11px] text-muted mt-1 italic">
                            Hỗ trợ biến: {'{{workflow.period}}'}, {'{{workflow.dueDate}}'} — khi instance được tạo, hệ thống gửi notification cho từng participant trong snapshot.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'vars' && (
                    <div className="space-y-5 bg-white p-5 rounded-lg border border-border shadow-sm">
                      <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                        <h3 className="text-sm font-bold text-navy">Biến Workflow</h3>
                        <span className="text-xs text-muted">{variables.length} biến</span>
                      </div>

                      {varError && (
                        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">
                          {varError}
                        </div>
                      )}

                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          placeholder="key (vd: threshold)"
                          className="flex-1 border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newVarKey}
                          onChange={e => setNewVarKey(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addVariable()}
                        />
                        <select
                          className="w-32 border border-border rounded-md px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                          value={newVarType}
                          onChange={e => setNewVarType(e.target.value)}
                        >
                          {VAR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                          type="text"
                          placeholder="Giá trị mặc định"
                          className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newVarDefault}
                          onChange={e => setNewVarDefault(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Mô tả (vd: Ngưỡng duyệt)"
                          className="flex-1 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          value={newVarDesc}
                          onChange={e => setNewVarDesc(e.target.value)}
                        />
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={newVarRequired}
                            onChange={e => setNewVarRequired(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          Bắt buộc
                        </label>
                        <button
                          onClick={addVariable}
                          className="px-3 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark flex items-center gap-1 shrink-0"
                        >
                          <PlusIcon className="w-4 h-4" /> Thêm
                        </button>
                      </div>

                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border">Key</th>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border">Loại dữ liệu</th>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border">Giá trị mặc định</th>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border">Bắt buộc</th>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border">Mô tả</th>
                              <th className="px-3 py-2 font-semibold text-muted border-b border-border"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {variables.map(v => (
                              <tr key={v.key} className="border-b border-border">
                                <td className="px-3 py-2 font-mono text-xs text-navy">{v.key}</td>
                                <td className="px-3 py-2 text-gray-600">{v.dataType}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  {v.defaultValue
                                    ? v.defaultValue.kind === 'CONSTANT'
                                      ? String(v.defaultValue.value ?? '')
                                      : v.defaultValue.kind === 'REFERENCE'
                                        ? `\${${v.defaultValue.path}}`
                                        : v.defaultValue.expression
                                    : '—'}
                                </td>
                                <td className="px-3 py-2">
                                  {v.required ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">Bắt buộc</span>
                                  ) : (
                                    <span className="text-gray-400">Không</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{v.description || '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  <button onClick={() => removeVariable(v.key)} className="text-danger hover:underline text-xs flex items-center gap-1 ml-auto">
                                    <TrashIcon className="w-3.5 h-3.5" /> Xóa
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {variables.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted">
                                  Chưa có biến nào. Thêm biến để dùng trong biểu thức điều kiện và mapping.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}