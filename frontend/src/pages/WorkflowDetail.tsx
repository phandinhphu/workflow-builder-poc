import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, ClockIcon, DocumentTextIcon, PlayIcon, PauseIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import VersionHistoryModal from '../components/VersionHistoryModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { useToasts } from '../components/Toast';
import { getWorkflow, getInstancesByWorkflow, userDisplayName, hasRunningInstances, workflowVersions } from '../data/mockData';

export default function WorkflowDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'runtime'>('info');
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [reactivateConfirmOpen, setReactivateConfirmOpen] = useState(false);
  const toasts = useToasts();

  const workflow = id ? getWorkflow(id) : undefined;

  if (!workflow) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-gray-500">
        <p className="text-sm mb-4">Không tìm thấy workflow</p>
        <Link to="/workflows" className="text-sm font-medium text-primary hover:underline">Quay lại danh sách</Link>
      </div>
    );
  }

  const statusLabel = workflow.status === 'PUBLISHED' ? 'Published' : workflow.status === 'SUSPENDED' ? 'Suspended' : 'Draft';
  const statusBadge =
    workflow.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
    workflow.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700';

  const instanceCount = getInstancesByWorkflow(workflow.id).length;
  const hasRunning = hasRunningInstances(workflow.id);

  const confirmSuspend = () => {
    toasts.pushToast('success', `Workflow "${workflow.name}" đã được tạm ngưng. Instance mới sẽ không được tạo.`);
    setSuspendConfirmOpen(false);
  };

  const confirmReactivate = () => {
    toasts.pushToast('success', `Workflow "${workflow.name}" đã được kích hoạt lại.`);
    setReactivateConfirmOpen(false);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/workflows" className="hover:text-primary">Danh sách Workflow</Link>
          <span>/</span>
          <span className="text-navy font-medium">{workflow.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <Link to="/workflows" className="text-gray-400 hover:text-navy p-2 rounded hover:bg-gray-100 transition-colors" aria-label="Quay lại">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-navy flex items-center gap-3 flex-1">
            {workflow.name}
          </h1>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusBadge}`}>
              {statusLabel}
            </span>
            {workflow.status === 'PUBLISHED' && (
              <button
                onClick={() => setSuspendConfirmOpen(true)}
                className="px-4 py-2 border border-border bg-white text-sm font-medium text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <PauseIcon className="w-4 h-4" /> Tạm ngưng Workflow
              </button>
            )}
            {workflow.status === 'SUSPENDED' && (
              <button
                onClick={() => setReactivateConfirmOpen(true)}
                className="px-4 py-2 border border-border bg-white text-sm font-medium text-gray-700 rounded hover:bg-gray-50 flex items-center gap-1"
              >
                <ArrowPathIcon className="w-4 h-4" /> Kích hoạt lại
              </button>
            )}
            <Link to={`/workflows/${workflow.id}/designer`} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark flex items-center gap-1">
              <PlayIcon className="w-4 h-4" /> Thiết kế
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
        <div className="flex border-b border-border bg-white">
          {[
            { id: 'info', name: 'Thông tin', icon: DocumentTextIcon },
            { id: 'history', name: 'Audit & History', icon: ClockIcon },
            { id: 'runtime', name: 'Theo dõi Runtime', icon: PlayIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.id ? "text-primary" : "text-gray-500 hover:text-navy"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-page">
          {activeTab === 'info' && (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4 border-b border-gray-100 pb-2">Thông tin chung</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Tên workflow</span>
                    <span className="text-sm font-medium text-navy">{workflow.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Trạng thái</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Loại workflow</span>
                    <span className="text-sm font-medium text-navy">{workflow.type}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Module</span>
                    <span className="text-sm font-medium text-navy">{workflow.module || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Người sở hữu</span>
                    <span className="text-sm font-medium text-navy">{userDisplayName(workflow.ownerId)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Phiên bản</span>
                    <span className="text-sm font-mono text-gray-600">v{workflow.draftVersion}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Ngày tạo</span>
                    <span className="text-sm font-medium text-navy">{workflow.createdAt}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted mb-1 uppercase tracking-wide">Cập nhật lần cuối</span>
                    <span className="text-sm font-medium text-navy">{workflow.updatedAt}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <h3 className="text-base font-bold text-navy mb-4 border-b border-gray-100 pb-2">Mô tả</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{workflow.description || 'Chưa có mô tả'}</p>
              </div>

              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-navy">Thiết lập workflow</h3>
                  <button onClick={() => setIsVersionHistoryOpen(true)} className="text-sm font-medium text-primary hover:underline">
                    Xem lịch sử phiên bản
                  </button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted">Trigger</span>
                    <span className="font-medium text-navy">
                      {workflow.trigger
                        ? workflow.trigger.type === 'manual' ? 'Kích hoạt thủ công'
                          : workflow.trigger.type === 'schedule' ? 'Theo lịch trình'
                          : workflow.trigger.type === 'form' ? 'Khi gửi biểu mẫu'
                          : 'Theo sự kiện Webhook'
                        : 'Chưa cấu hình'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted">Đối tượng tham gia</span>
                    <span className="font-medium text-navy">
                      {workflow.participantScope?.enabled
                        ? workflow.participantScope.selectorType === 'fixed' ? 'Tất cả người dùng' : workflow.participantScope.selectorType
                        : 'Không bật'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted">Biến workflow</span>
                    <span className="font-medium text-navy">
                      {workflow.variables.length > 0
                        ? `${workflow.variables.length} biến (${workflow.variables.map(v => v.key).join(', ')})`
                        : 'Chưa có biến'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-navy">Lịch sử phiên bản</h3>
                <button onClick={() => setIsVersionHistoryOpen(true)} className="text-sm font-medium text-primary hover:underline">
                  Mở toàn màn hình
                </button>
              </div>
              <div className="space-y-4">
                {workflowVersions.map(v => (
                  <div key={v.id} className="bg-white border border-border rounded-lg p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide',
                          v.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                          v.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                        )}>
                          {v.status === 'DRAFT' ? 'Draft' : v.status === 'PUBLISHED' ? 'Published' : 'Suspended'}
                        </span>
                        <span className="text-sm font-mono font-bold text-navy">v{v.versionNo}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-navy">{v.author}</p>
                        <p className="text-xs text-muted">{v.createdAt}</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {v.changes.map((change, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'runtime' && (
            <div className="p-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-navy">Danh sách Instance</h3>
                <Link
                  to={`/workflows/${workflow.id}/runtime`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:bg-primary-dark"
                >
                  Mở trang theo dõi Runtime
                </Link>
              </div>
              <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-navy">{instanceCount}</p>
                    <p className="text-xs text-muted">Tổng instance</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-navy">{hasRunning ? 'Có' : 'Không'}</p>
                    <p className="text-xs text-muted">Instance đang chạy</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-navy">{workflow.status === 'PUBLISHED' ? 'Sẵn sàng' : statusLabel}</p>
                    <p className="text-xs text-muted">Trạng thái nhận instance mới</p>
                  </div>
                </div>
                {hasRunning && (
                  <p className="text-sm text-muted bg-orange-50 border border-orange-200 rounded-lg p-4">
                    Workflow này đang có instance chạy dở. Việc chỉnh sửa/publish phiên bản mới không ảnh hưởng tới các instance đang chạy.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <VersionHistoryModal isOpen={isVersionHistoryOpen} onClose={() => setIsVersionHistoryOpen(false)} />

      <ConfirmDialog
        isOpen={suspendConfirmOpen}
        title="Tạm ngưng workflow"
        message={`Tạm ngưng "${workflow.name}"? Các instance đang chạy vẫn tiếp tục, nhưng không tạo được instance mới.`}
        confirmLabel="Tạm ngưng"
        onClose={() => setSuspendConfirmOpen(false)}
        onConfirm={confirmSuspend}
      />

      <ConfirmDialog
        isOpen={reactivateConfirmOpen}
        title="Kích hoạt lại workflow"
        message={`Kích hoạt lại "${workflow.name}"? Workflow sẽ nhận instance mới trở lại.`}
        confirmLabel="Kích hoạt lại"
        onClose={() => setReactivateConfirmOpen(false)}
        onConfirm={confirmReactivate}
      />

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}