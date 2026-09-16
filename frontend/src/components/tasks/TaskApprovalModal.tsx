import { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Mail,
  Tag,
  AlertCircle,
  Loader2,
  History,
  FileText
} from 'lucide-react';
import type { TaskDefinition } from '../../types/task';
import DynamicFormRenderer from '../forms/DynamicFormRenderer';

interface TaskApprovalModalProps {
  task: TaskDefinition;
  onClose: () => void;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (comment: string) => Promise<void>;
}

export default function TaskApprovalModal({
  task,
  onClose,
  onApprove,
  onReject,
}: TaskApprovalModalProps) {
  const [comment, setComment] = useState('');
  const [showRejectWarning, setShowRejectWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  const initiator = task.initiator;
  const isApprovalOrReview = task.taskType === 'APPROVAL' || task.taskType === 'REVIEW';
  const hasFormSchema = Boolean(task.formSchemaSnapshot && task.formSchemaSnapshot.fields?.length);
  const hasFormData = Boolean(task.formData && Object.keys(task.formData).length > 0);
  const historyList = task.approvalHistory || [];

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await onApprove(comment.trim() || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setShowRejectWarning(true);
      return;
    }
    setShowRejectWarning(false);
    setSubmitting(true);
    try {
      await onReject(comment.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    NORMAL: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    CLAIMED: 'bg-blue-100 text-blue-800 border-blue-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const isCompleted = task.status === 'COMPLETED' || task.status === 'REJECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="border-b border-gray-100 bg-linear-to-r from-gray-50 via-white to-gray-50 px-6 py-4.5 mt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {task.ticketCode && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200 font-mono">
                    <Tag className="w-3.5 h-3.5" />
                    {task.ticketCode}
                  </span>
                )}
                {task.categoryName && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                    {task.categoryName}
                  </span>
                )}
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${priorityColors[task.metadata?.priority as string] || 'bg-blue-100 text-blue-700'
                    }`}
                >
                  {String(task.metadata?.priority || 'NORMAL')}
                </span>
                <span
                  className={`rounded-md border px-2.5 py-0.5 text-xs font-medium ${statusColors[task.status || 'PENDING'] || 'bg-gray-100 text-gray-700'
                    }`}
                >
                  {task.status || 'PENDING'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{task.title}</h2>
              {task.description && <p className="text-sm text-gray-500">{task.description}</p>}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB BAR */}
          <div className="mt-4 flex gap-4 border-b border-gray-200/80 -mb-4.5">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-1.5 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'form'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
            >
              <FileText className="w-4 h-4" />
              Thông tin nộp phiếu {task.formName ? `(${task.formName})` : ''}
            </button>
            {historyList.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
              >
                <History className="w-4 h-4" />
                Lịch sử xét duyệt ({historyList.length})
              </button>
            )}
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* INITIATOR PROFILE CARD */}
          {initiator && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 transition-all">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-2">
                Thông tin người tạo phiếu (Initiator)
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base shadow-xs">
                  {initiator.displayName
                    ? initiator.displayName
                      .split(' ')
                      .slice(-1)[0]
                      .charAt(0)
                      .toUpperCase()
                    : 'U'}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {initiator.displayName || initiator.userId}
                    </span>
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-mono text-blue-800">
                      {initiator.userId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    {initiator.departmentName && (
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-gray-400" />
                        {initiator.departmentName}
                      </span>
                    )}
                    {initiator.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        {initiator.email}
                      </span>
                    )}
                    {task.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Tạo lúc: {new Date(task.createdAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: FORM DATA */}
          {activeTab === 'form' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Dữ liệu biểu mẫu đã nộp (Ticket Form Data)
                </h3>
                {task.formVersionNumber && (
                  <span className="text-xs text-gray-500 font-mono">
                    Phiên bản Form: v{task.formVersionNumber}
                  </span>
                )}
              </div>

              {hasFormSchema ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-5">
                  <DynamicFormRenderer
                    schema={task.formSchemaSnapshot}
                    formData={task.formData || {}}
                    mode="readonly"
                  />
                </div>
              ) : hasFormData ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs divide-y divide-gray-100">
                  {Object.entries(task.formData || {}).map(([key, val]) => (
                    <div key={key} className="py-2.5 flex justify-between items-center text-sm">
                      <span className="font-semibold text-gray-600 font-mono text-xs">{key}</span>
                      <span className="font-bold text-gray-900 text-right max-w-xs break-words">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                  <p className="text-sm">Không có dữ liệu biểu mẫu nào cho nhiệm vụ này.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: APPROVAL HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                Lịch sử xét duyệt qua các bước
              </h3>
              <div className="space-y-3 border-l-2 border-blue-200 pl-4 ml-2">
                {historyList.map((item, idx) => (
                  <div key={item.taskId || idx} className="relative pb-4 last:pb-0">
                    <div
                      className={`absolute -left-[23px] top-0.5 h-4 w-4 rounded-full border-2 border-white ${item.action === 'COMPLETE' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                    />
                    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-gray-900">
                          {item.approverName || item.approverId || 'Người duyệt'}
                        </span>
                        <span className="text-gray-400">
                          {item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-semibold ${item.action === 'COMPLETE' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                        >
                          {item.action === 'COMPLETE' ? 'Đã phê duyệt' : 'Đã từ chối'}
                        </span>
                        {item.nodeName && <span className="text-gray-400">({item.nodeName})</span>}
                      </div>
                      {item.comment && (
                        <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-700 border border-gray-100 italic">
                          "{item.comment}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTION COMMENT AREA (IF NOT COMPLETED) */}
          {!isCompleted && (
            <div className="space-y-2 border-t border-gray-100 pt-4">
              <label htmlFor="approval-comment" className="block text-xs font-bold text-gray-700 uppercase">
                Ý kiến / Nhận xét của Người duyệt:
              </label>
              <textarea
                id="approval-comment"
                rows={3}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (showRejectWarning && e.target.value.trim()) {
                    setShowRejectWarning(false);
                  }
                }}
                placeholder="Nhập ý kiến phê duyệt hoặc lý do (bắt buộc khi từ chối)..."
                className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 ${showRejectWarning
                    ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200 text-rose-900'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
              />
              {showRejectWarning && (
                <p className="flex items-center gap-1 text-xs font-semibold text-rose-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Vui lòng nhập lý do từ chối để người gửi phiếu nắm được thông tin.
                </p>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Đóng
          </button>

          {!isCompleted && isApprovalOrReview && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-400 active:scale-98 transition-all shadow-2xs disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Từ chối (Reject)
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 active:scale-98 transition-all shadow-xs disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Phê duyệt (Approve)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
