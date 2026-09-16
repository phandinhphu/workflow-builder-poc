import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  PlusCircle,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  RefreshCw,
  Ban,
  Tag,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { TicketSummary, TicketStatus } from '../types/ticket';
import type { TicketCategorySummary } from '../types/category';
import { useAuthStore } from '../stores/authStore';

export default function TicketHub() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, hasPermission } = useAuthStore();

  const canManageAll = isAdmin() || hasPermission('TICKET_MANAGE');

  const [activeTab, setActiveTab] = useState<'new' | 'my' | 'all'>('new');

  // Categories list state (for Tab 1)
  const [categories, setCategories] = useState<TicketCategorySummary[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Tickets list state (for Tab 2 & 3)
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Load Categories for Tab 1
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await api.ticketCategories.list(categorySearch || undefined, true);
      setCategories(data);
    } catch (err) {
      console.error('Lỗi khi tải danh mục ticket', err);
    } finally {
      setLoadingCategories(false);
    }
  }, [categorySearch]);

  // Load Tickets for Tab 2 or 3
  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const params = {
        search: ticketSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      };
      const data = activeTab === 'all'
        ? await api.tickets.allTickets(params)
        : await api.tickets.myTickets(params);
      setTickets(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách ticket', err);
    } finally {
      setLoadingTickets(false);
    }
  }, [activeTab, ticketSearch, statusFilter]);

  useEffect(() => {
    if (activeTab === 'new') {
      void loadCategories();
    } else {
      void loadTickets();
    }
  }, [activeTab, loadCategories, loadTickets]);

  const handleCancelTicket = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu này? Quy trình đang xử lý sẽ dừng lại.')) return;
    try {
      await api.tickets.cancel(ticketId);
      void loadTickets();
    } catch (err: any) {
      alert(err.message || 'Không thể hủy yêu cầu');
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Mới gửi
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <RefreshCw className="w-3 h-3 animate-spin" /> Đang xử lý
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đã phê duyệt
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle2 className="w-3 h-3" /> Đã giải ngân
          </span>
        );
      case 'COMPLETED':
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-3 h-3" /> Hoàn tất
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" /> Từ chối
          </span>
        );
      case 'PROCESSING_ERROR':
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" /> Lỗi xử lý
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <Ban className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Ticket className="w-3.5 h-3.5 text-yellow-300" />
            <span>Cổng Tiếp Nhận & Quản Lý Yêu Cầu (Tickets)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Phiếu Yêu Cầu & Quy Trình Dịch Vụ</h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Chọn danh mục dịch vụ để gửi yêu cầu mới hoặc theo dõi tiến độ xử lý và phê duyệt các phiếu yêu cầu của bạn theo thời gian thực.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-0">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('new')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo yêu cầu mới</span>
          </button>

          <button
            onClick={() => setActiveTab('my')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'my'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Vé của tôi</span>
          </button>

          {/* Conditional Admin tab */}
          {canManageAll && (
            <button
              onClick={() => setActiveTab('all')}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'all'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Tất cả yêu cầu</span>
              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">
                Admin
              </span>
            </button>
          )}
        </div>

        <button
          onClick={() => (activeTab === 'new' ? void loadCategories() : void loadTickets())}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* TAB 1: NEW REQUEST (CATEGORIES GRID) */}
      {activeTab === 'new' && (
        <div className="space-y-6">
          {/* Search bar for Categories */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm danh mục yêu cầu, dịch vụ..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <p className="text-xs text-gray-500">
              Có <strong className="text-gray-800">{categories.length}</strong> danh mục yêu cầu đang sẵn sàng
            </p>
          </div>

          {loadingCategories ? (
            <div className="py-16 text-center text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm">Đang tải danh mục dịch vụ...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">Không tìm thấy danh mục nào</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                Hiện tại chưa có danh mục yêu cầu nào được kích hoạt hoặc không khớp với từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => {
                const iconColor = cat.color || '#3b82f6';
                return (
                  <div
                    key={cat.id}
                    onClick={() => navigate(`/tickets/new/${cat.id}`)}
                    className="group bg-white rounded-2xl border border-gray-200/80 p-6 hover:shadow-xl hover:border-primary/40 transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md transition-transform group-hover:scale-105"
                          style={{ backgroundColor: iconColor }}
                        >
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200">
                          {cat.code}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {cat.description || 'Gửi yêu cầu và tự động khởi tạo quy trình xét duyệt theo đúng quy định.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span>Biểu mẫu: <strong className="text-gray-600 font-medium">{cat.formName || 'Đã liên kết'}</strong></span>
                        <span>v{cat.formVersionNumber || 1}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 flex items-center justify-between text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                      <span>Bắt đầu tạo yêu cầu</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & TAB 3: TICKETS TABLE (MY TICKETS & ALL TICKETS) */}
      {(activeTab === 'my' || activeTab === 'all') && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã vé, người gửi..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {['ALL', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PAID', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st === 'ALL' && 'Tất cả trạng thái'}
                  {st === 'SUBMITTED' && 'Mới gửi'}
                  {st === 'IN_REVIEW' && 'Đang xử lý'}
                  {st === 'APPROVED' && 'Đã duyệt'}
                  {st === 'PAID' && 'Đã giải ngân'}
                  {st === 'COMPLETED' && 'Hoàn tất'}
                  {st === 'REJECTED' && 'Từ chối'}
                  {st === 'CANCELLED' && 'Đã hủy'}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loadingTickets ? (
              <div className="py-16 text-center text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm">Đang tải danh sách phiếu yêu cầu...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-gray-800">Chưa có yêu cầu nào</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                  {activeTab === 'my'
                    ? 'Bạn chưa tạo phiếu yêu cầu nào. Hãy bấm sang tab "Tạo yêu cầu mới" để gửi phiếu đầu tiên.'
                    : 'Không tìm thấy phiếu yêu cầu nào phù hợp với bộ lọc.'}
                </p>
                {activeTab === 'my' && (
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tạo yêu cầu ngay
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Mã Vé</th>
                      <th className="px-6 py-4">Danh Mục</th>
                      {activeTab === 'all' && <th className="px-6 py-4">Người Gửi</th>}
                      <th className="px-6 py-4">Trạng Thái</th>
                      <th className="px-6 py-4">Bước Hiện Tại</th>
                      <th className="px-6 py-4">Ngày Tạo</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {tickets.map((t) => {
                      const canCancel = (t.status === 'SUBMITTED' || t.status === 'IN_REVIEW') &&
                        (t.initiatorId === currentUser?.id || canManageAll);
                      return (
                        <tr
                          key={t.id}
                          onClick={() => navigate(`/tickets/${t.id}`)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-4 font-mono font-bold text-primary group-hover:underline">
                            {t.ticketCode}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: t.categoryColor || '#3b82f6' }}
                              />
                              <span className="font-medium text-gray-900">{t.categoryName || '—'}</span>
                            </div>
                          </td>
                          {activeTab === 'all' && (
                            <td className="px-6 py-4 text-gray-700 font-medium">
                              {t.initiatorName}
                            </td>
                          )}
                          <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {t.currentStepName || '—'}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs">
                            {new Date(t.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              {canCancel && (
                                <button
                                  type="button"
                                  onClick={(e) => void handleCancelTicket(e, t.id)}
                                  title="Hủy yêu cầu"
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tickets/${t.id}`);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 group-hover:bg-primary group-hover:text-white transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Chi tiết</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
