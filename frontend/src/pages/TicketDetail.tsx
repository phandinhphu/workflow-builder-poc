import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  User,
  Calendar,
  FileText,
  RefreshCw,
  GitBranch,
  Check,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import type { TicketDetail as TicketDetailType, TicketStatus } from '../types/ticket';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';
import { useAuthStore } from '../stores/authStore';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isAdmin, hasPermission } = useAuthStore();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.tickets.get(id);
      setTicket(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Không thể tải thông tin phiếu yêu cầu');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadTicket();
  }, [loadTicket]);

  const handleCancelTicket = async () => {
    if (!id) return;
    if (!confirm('Bạn có chắc chắn muốn hủy phiếu yêu cầu này không?')) return;
    setCancelling(true);
    try {
      const updated = await api.tickets.cancel(id);
      setTicket(updated);
    } catch (err: any) {
      alert(err.message || 'Không thể hủy yêu cầu');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Mới gửi
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã phê duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Từ chối
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <Ban className="w-3.5 h-3.5" /> Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Đang tải thông tin phiếu yêu cầu...</p>
        </div>
      </div>
    );
  }

  if (!ticket || error) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">Không thể tải phiếu yêu cầu</h2>
        <p className="text-sm text-gray-500">{error || 'Không tìm thấy dữ liệu yêu cầu này.'}</p>
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách yêu cầu
        </button>
      </div>
    );
  }

  const canCancel = (ticket.status === 'SUBMITTED' || ticket.status === 'IN_REVIEW') &&
    (ticket.initiatorId === currentUser?.id || isAdmin() || hasPermission('TICKET_MANAGE'));

  const iconColor = ticket.categoryColor || '#3b82f6';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách phiếu</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadTicket()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>

          {canCancel && (
            <button
              onClick={() => void handleCancelTicket()}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-xs transition-colors disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{cancelling ? 'Đang hủy...' : 'Hủy yêu cầu'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket Overview Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
              style={{ backgroundColor: iconColor }}
            >
              <Ticket className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold text-gray-900 font-mono">
                  {ticket.ticketCode}
                </h1>
                {getStatusBadge(ticket.status)}
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {ticket.categoryName} <span className="text-gray-400 font-normal">({ticket.categoryCode})</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col md:items-end text-sm text-gray-500">
            <span className="text-xs text-gray-400">Bước hiện tại</span>
            <span className="font-bold text-primary text-base mt-0.5">
              {ticket.currentStepName || '—'}
            </span>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-sm">
          <div>
            <span className="text-xs text-gray-400 block mb-1">Người gửi</span>
            <div className="flex items-center gap-1.5 font-semibold text-gray-800">
              <User className="w-4 h-4 text-gray-400" />
              <span>{ticket.initiatorName}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Phòng ban</span>
            <div className="font-medium text-gray-700">
              {ticket.initiatorDepartmentName || '—'}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Thời gian gửi</span>
            <div className="flex items-center gap-1.5 text-gray-600 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{new Date(ticket.createdAt).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-400 block mb-1">Thời gian hoàn tất</span>
            <div className="text-gray-600 text-xs">
              {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('vi-VN') : 'Đang xử lý'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Content Read-Only (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Dữ liệu biểu mẫu đã gửi</span>
              </h2>
              <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                Biểu mẫu: {ticket.formName || 'Snapshot'} (v{ticket.formVersionNumber || 1})
              </span>
            </div>

            <DynamicFormRenderer
              schema={ticket.formSchemaSnapshot}
              formData={ticket.formData}
              mode="readonly"
            />
          </div>
        </div>

        {/* Right Column: Workflow Progress Timeline (1 col) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary" />
                <span>Tiến trình xử lý</span>
              </h3>
              <span className="text-xs font-semibold text-primary">
                {ticket.timeline?.length || 0} bước
              </span>
            </div>

            {(!ticket.timeline || ticket.timeline.length === 0) ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                Chưa có bước thực thi nào được ghi nhận.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {ticket.timeline.map((item, idx) => {
                  const isRejected = item.action === 'REJECTED' || item.outcomePort === 'REJECTED';
                  const isFailed = item.state === 'FAILED';
                  const isRunning = item.state === 'RUNNING';
                  const isCompleted = item.state === 'COMPLETED' && !isRejected;

                  let badgeText = item.state as string;
                  let badgeClass = 'bg-gray-200 text-gray-700';

                  if (isRejected) {
                    badgeText = 'TỪ CHỐI';
                    badgeClass = 'bg-rose-100 text-rose-800 border border-rose-200 font-bold';
                  } else if (item.action === 'APPROVED') {
                    badgeText = 'ĐÃ DUYỆT';
                    badgeClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold';
                  } else if (isCompleted) {
                    badgeText = 'HOÀN THÀNH';
                    badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  } else if (isRunning) {
                    badgeText = 'ĐANG XỬ LÝ';
                    badgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
                  } else if (isFailed) {
                    badgeText = 'THẤT BẠI';
                    badgeClass = 'bg-rose-100 text-rose-800 border border-rose-200';
                  }

                  return (
                    <div key={`${item.nodeId}-${idx}`} className="relative group">
                      {/* Node Icon Circle */}
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                          isRejected
                            ? 'bg-rose-500 text-white'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isRunning
                            ? 'bg-primary text-white animate-pulse'
                            : isFailed
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isRejected && <X className="w-3 h-3 stroke-[3]" />}
                        {!isRejected && isCompleted && <Check className="w-3 h-3 stroke-[2.5]" />}
                        {isRunning && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        {isFailed && !isRejected && <span className="text-xs">×</span>}
                      </div>

                      <div className="bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-medium">
                              #{item.executionOrder || (idx + 1)}
                            </span>
                            <span>{item.nodeName || item.nodeId}</span>
                          </h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </div>

                        {item.assigneeName && (
                          <p className="text-[11px] text-gray-600 mt-1">
                            Người xử lý: <strong className="text-gray-800 font-semibold">{item.assigneeName}</strong>
                          </p>
                        )}

                        {item.comment && (
                          <div className="mt-2 text-xs italic text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                            "{item.comment}"
                          </div>
                        )}

                        <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
                          <span>{item.startedAt ? new Date(item.startedAt).toLocaleTimeString('vi-VN') : ''}</span>
                          {item.completedAt && (
                            <span>Xong: {new Date(item.completedAt).toLocaleTimeString('vi-VN')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
