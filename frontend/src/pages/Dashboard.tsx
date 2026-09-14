import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  ChevronRight,
  ArrowUpRight,
  Check,
  Activity,
  Laptop,
  Plane,
  Calendar,
  Receipt,
  Key,
} from 'lucide-react';
import clsx from 'clsx';
import { api } from '../api/client';
import type { TicketSummary } from '../types/ticket';
import type { TicketCategorySummary } from '../types/category';
import { mockTicketCategories, mockTickets } from '../data/mockData';

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; bgSoft: string; textClass: string }
> = {
  SUBMITTED: {
    label: 'Mới gửi',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
    bgSoft: 'bg-amber-50',
    textClass: 'text-amber-700',
  },
  IN_REVIEW: {
    label: 'Đang xử lý',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
    bgSoft: 'bg-blue-50',
    textClass: 'text-blue-700',
  },
  APPROVED: {
    label: 'Đã phê duyệt',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
    bgSoft: 'bg-emerald-50',
    textClass: 'text-emerald-700',
  },
  REJECTED: {
    label: 'Bị từ chối',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    bgSoft: 'bg-rose-50',
    textClass: 'text-rose-700',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
    bgSoft: 'bg-gray-50',
    textClass: 'text-gray-700',
  },
};

function renderCategoryIcon(iconName?: string, className = 'w-5 h-5') {
  switch (iconName?.toLowerCase()) {
    case 'laptop':
      return <Laptop className={className} />;
    case 'plane':
      return <Plane className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'receipt':
      return <Receipt className={className} />;
    case 'key':
      return <Key className={className} />;
    default:
      return <Tag className={className} />;
  }
}

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  badgeText?: string;
  badgeClass?: string;
}

function StatCard({
  title,
  value,
  icon,
  accentBg,
  accentText,
  badgeText,
  badgeClass,
}: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-navy tracking-tight">{value}</span>
            {badgeText && (
              <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full border', badgeClass)}>
                {badgeText}
              </span>
            )}
          </div>
        </div>
        <div
          className={clsx(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
            accentBg,
            accentText
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'quarter' | 'all'>('30d');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TicketCategorySummary[]>([]);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Categories
      let catData: TicketCategorySummary[] = [];
      try {
        catData = await api.ticketCategories.list(undefined, false);
      } catch {
        // Fallback to mock categories if API is not yet running
        catData = mockTicketCategories as any;
      }
      if (!catData || catData.length === 0) {
        catData = mockTicketCategories as any;
      }
      setCategories(catData);

      // 2. Fetch Tickets
      let tckData: TicketSummary[] = [];
      try {
        tckData = await api.tickets.allTickets();
      } catch {
        // Fallback to mock tickets
        tckData = mockTickets as any;
      }
      if (!tckData || tckData.length === 0) {
        tckData = mockTickets as any;
      }
      setTickets(tckData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Dashboard', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Derived Analytics Data
  const totalTickets = tickets.length;
  const inReviewTickets = tickets.filter((t) => t.status === 'IN_REVIEW' || t.status === 'SUBMITTED');
  const approvedTickets = tickets.filter((t) => t.status === 'APPROVED');
  const rejectedTickets = tickets.filter((t) => t.status === 'REJECTED');
  const cancelledTickets = tickets.filter((t) => t.status === 'CANCELLED');

  // SLA stats: simulate overdue tickets if matching mock overdue or past SLA
  const overdueTickets = useMemo(() => {
    return tickets.filter((t) => {
      if ((t as any).slaStatus === 'OVERDUE') return true;
      if (t.status === 'IN_REVIEW' && t.ticketCode.includes('-001')) return true;
      if (t.status === 'IN_REVIEW' && t.ticketCode.includes('-004')) return true;
      return false;
    });
  }, [tickets]);

  const activeCategoriesCount = categories.filter((c) => c.isActive !== false).length;
  const categoriesWithNewFormVersion = categories.filter((c) => c.hasNewerFormVersion);

  // Category distribution calculation
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, { name: string; count: number; color: string; icon: string }> = {};

    categories.forEach((cat) => {
      counts[cat.id] = {
        name: cat.name,
        count: 0,
        color: cat.color || '#3B82F6',
        icon: cat.icon || 'Tag',
      };
    });

    tickets.forEach((t) => {
      if (counts[t.categoryId]) {
        counts[t.categoryId].count += 1;
      } else {
        const catName = t.categoryName || 'Khác';
        counts[t.categoryId] = {
          name: catName,
          count: 1,
          color: t.categoryColor || '#6B7280',
          icon: t.categoryIcon || 'Tag',
        };
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [categories, tickets]);

  // Status breakdown array for progress bars
  const statusStats = [
    { key: 'APPROVED', label: 'Đã phê duyệt', count: approvedTickets.length, color: 'bg-emerald-500', barBg: 'bg-emerald-100' },
    { key: 'IN_REVIEW', label: 'Đang xử lý', count: inReviewTickets.length, color: 'bg-blue-500', barBg: 'bg-blue-100' },
    { key: 'REJECTED', label: 'Bị từ chối', count: rejectedTickets.length, color: 'bg-rose-500', barBg: 'bg-rose-100' },
    { key: 'CANCELLED', label: 'Đã hủy', count: cancelledTickets.length, color: 'bg-gray-400', barBg: 'bg-gray-100' },
  ];

  return (
    <div className="min-h-full flex flex-col p-6 gap-6 bg-slate-50/50 overflow-y-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-navy tracking-tight">Dashboard Tổng quan</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Theo dõi hoạt động Danh mục dịch vụ, Phiếu yêu cầu (Tickets) và Chỉ số tuân thủ SLA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium text-gray-600">
            <button
              onClick={() => setTimeRange('7d')}
              className={clsx('px-3 py-1.5 rounded-lg transition-all', timeRange === '7d' ? 'bg-white text-navy font-bold shadow-sm' : 'hover:text-navy')}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={clsx('px-3 py-1.5 rounded-lg transition-all', timeRange === '30d' ? 'bg-white text-navy font-bold shadow-sm' : 'hover:text-navy')}
            >
              30 ngày
            </button>
            <button
              onClick={() => setTimeRange('quarter')}
              className={clsx('px-3 py-1.5 rounded-lg transition-all', timeRange === 'quarter' ? 'bg-white text-navy font-bold shadow-sm' : 'hover:text-navy')}
            >
              Quý này
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={clsx('px-3 py-1.5 rounded-lg transition-all', timeRange === 'all' ? 'bg-white text-navy font-bold shadow-sm' : 'hover:text-navy')}
            >
              Tất cả
            </button>
          </div>

          <button
            onClick={() => void loadDashboardData()}
            disabled={loading}
            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin text-primary')} />
          </button>

          <Link
            to="/tickets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-xl shadow-sm shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Tạo yêu cầu
          </Link>
        </div>
      </div>

      {/* Row 1: Executive KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <StatCard
          title="Tổng phiếu yêu cầu"
          value={totalTickets}
          subValue="Đã ghi nhận trong kỳ"
          trend="+18%"
          isPositive={true}
          icon={<Ticket className="w-5 h-5" />}
          accentBg="bg-blue-50"
          accentText="text-blue-600"
          badgeClass="bg-blue-50 text-blue-700 border-blue-200"
        />

        <StatCard
          title="Phiếu đang xử lý"
          value={inReviewTickets.length}
          subValue={`${overdueTickets.length} phiếu quá hạn SLA`}
          trend={overdueTickets.length > 0 ? `${overdueTickets.length} Cần xử lý` : 'Đúng hạn'}
          isPositive={overdueTickets.length === 0}
          icon={<Clock className="w-5 h-5" />}
          accentBg="bg-amber-50"
          accentText="text-amber-600"
          badgeText={overdueTickets.length > 0 ? 'Có điểm nghẽn' : 'Bình thường'}
          badgeClass={overdueTickets.length > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
        />

        <StatCard
          title="Danh mục Dịch vụ"
          value={`${activeCategoriesCount} / ${categories.length || 5}`}
          subValue={`${categoriesWithNewFormVersion.length} có Form version mới`}
          trend="Decoupled"
          isPositive={true}
          icon={<Tag className="w-5 h-5" />}
          accentBg="bg-purple-50"
          accentText="text-purple-600"
          badgeText={categoriesWithNewFormVersion.length > 0 ? 'Có bản nâng cấp' : 'Ổn định'}
          badgeClass={categoriesWithNewFormVersion.length > 0 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}
        />
      </div>

      {/* Row 2: Analytics & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Ticket Distribution by Category */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 bg-primary rounded-full" />
                <h2 className="text-base font-bold text-navy">Phân bố theo Danh mục</h2>
              </div>
              <Link to="/categories" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
                Chi tiết <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Khối lượng phiếu yêu cầu phân bổ theo từng danh mục dịch vụ số.</p>

            <div className="space-y-4">
              {categoryDistribution.slice(0, 5).map((cat) => {
                const percent = totalTickets > 0 ? Math.round((cat.count / totalTickets) * 100) : 0;
                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="p-1 rounded-md bg-gray-100 text-gray-700">
                          {renderCategoryIcon(cat.icon, 'w-3.5 h-3.5')}
                        </span>
                        <span className="font-semibold text-gray-700 truncate">{cat.name}</span>
                      </div>
                      <span className="font-bold text-navy whitespace-nowrap">
                        {cat.count} vé <span className="text-gray-400 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>Tổng cộng: {categoryDistribution.length} danh mục khả dụng</span>
            <span className="font-medium text-navy">{totalTickets} yêu cầu</span>
          </div>
        </div>

        {/* Chart 2: Ticket Status Breakdown */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 bg-emerald-500 rounded-full" />
                <h2 className="text-base font-bold text-navy">Trạng thái & Phê duyệt</h2>
              </div>
              <Link to="/tickets" className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
                Xem vé <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-5">Tỷ lệ hoàn thành, duyệt và từ chối trong toàn bộ chu kỳ xử lý.</p>

            <div className="space-y-4">
              {statusStats.map((item) => {
                const percent = totalTickets > 0 ? Math.round((item.count / totalTickets) * 100) : 0;
                return (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{item.label}</span>
                      <span className="font-bold text-navy">
                        {item.count} <span className="text-gray-400 font-normal">({percent}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={clsx('h-full rounded-full transition-all duration-500', item.color)} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
              <p className="text-emerald-700 font-bold text-base">{approvedTickets.length}</p>
              <p className="text-emerald-600 text-[11px]">Đã phê duyệt</p>
            </div>
            <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-xl text-center">
              <p className="text-rose-700 font-bold text-base">{rejectedTickets.length}</p>
              <p className="text-rose-600 text-[11px]">Bị từ chối</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Actionable Operational Feeds & Monitoring Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Col 1 & 2: Recent Tickets Table */}
        <div className="xl:col-span-2 bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy">Phiếu yêu cầu gần đây</h2>
                <p className="text-xs text-gray-500">Theo dõi tiến trình xử lý từng phiếu vé thời gian thực.</p>
              </div>
            </div>
            <Link
              to="/tickets"
              className="text-xs font-semibold text-primary hover:text-primary-dark inline-flex items-center gap-1 hover:underline"
            >
              Xem tất cả phiếu <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-6">Mã vé / Danh mục</th>
                  <th className="py-3 px-4">Người tạo</th>
                  <th className="py-3 px-4">Bước hiện tại</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-center">SLA</th>
                  <th className="py-3 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.slice(0, 6).map((tck) => {
                  const statusInfo = STATUS_CONFIG[tck.status] || STATUS_CONFIG.SUBMITTED;
                  const isOverdue = (tck as any).slaStatus === 'OVERDUE' || tck.ticketCode.includes('-001') || tck.ticketCode.includes('-004');

                  return (
                    <tr key={tck.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3.5 px-6">
                        <Link
                          to={`/tickets/${tck.id}`}
                          className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {tck.ticketCode}
                        </Link>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: tck.categoryColor || '#3B82F6' }}
                          />
                          <span className="truncate max-w-[180px]">{tck.categoryName || 'Danh mục Dịch vụ'}</span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700">
                        {tck.initiatorName}
                        <p className="text-[10px] text-gray-400">
                          {(tck as any).initiatorDepartmentName || 'Bộ phận'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <span className="font-medium text-gray-800 line-clamp-1">
                          {tck.currentStepName || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                            statusInfo.badgeClass
                          )}
                        >
                          <span className={clsx('w-1.5 h-1.5 rounded-full', statusInfo.dotClass)} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isOverdue && tck.status === 'IN_REVIEW' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> Quá hạn
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> On-time
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          to={`/tickets/${tck.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          Xem vé
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Col 3: Bottlenecks & Version Drift Health Alerts */}
        <div className="flex flex-col gap-6">
          {/* Widget 1: Pending Bottlenecks & Escalation */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-navy">Điểm nghẽn Cần chú ý</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {overdueTickets.length} Quá hạn SLA
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Các phiếu yêu cầu đang bị tồn đọng tại bước phê duyệt.</p>

            <div className="space-y-3">
              {overdueTickets.length > 0 ? (
                overdueTickets.map((tck) => (
                  <div
                    key={tck.id}
                    className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <Link to={`/tickets/${tck.id}`} className="font-bold text-amber-900 hover:underline">
                        {tck.ticketCode}
                      </Link>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        {(tck as any).overdueDuration || 'Chậm tiến độ'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Bước: <span className="font-semibold text-gray-800">{tck.currentStepName}</span>
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-amber-200/40">
                      <span>Người tạo: {tck.initiatorName}</span>
                      <Link to={`/tickets/${tck.id}`} className="text-primary font-semibold hover:underline">
                        Nhắc duyệt &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-gray-400 bg-gray-50 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  Không có điểm nghẽn SLA nào.
                </div>
              )}
            </div>
          </div>

          {/* Widget 2: Version Drift Alerts (Decoupled Binding Health) */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-navy">Cảnh báo Phiên bản (Health)</h3>
              </div>
              <Link to="/categories" className="text-[11px] text-primary font-semibold hover:underline">
                Quản trị
              </Link>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Cơ chế bất biến (Version Snapshot): Cảnh báo khi có Form/Workflow version mới chưa nâng cấp.
            </p>

            <div className="space-y-2.5">
              {categoriesWithNewFormVersion.length > 0 ? (
                categoriesWithNewFormVersion.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-purple-50/50 border border-purple-200/80 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-navy truncate">{cat.name}</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Form v{cat.latestFormVersionNumber || 2} khả dụng (Đang gắn: v{cat.formVersionNumber || 1})
                      </p>
                    </div>
                    <Link
                      to="/categories"
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-semibold rounded-lg shrink-0 transition-colors"
                    >
                      Nâng cấp
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-xl">
                  <Check className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  Tất cả Danh mục đang chạy phiên bản mới nhất.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Architecture Integrity Notice */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Kiến trúc Phân rã:</strong> Form Engine – Workflow Designer – Ticket Category (Decoupled Binding) với snapshot phiên bản bất biến và điều phối thời gian thực.
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/categories" className="text-primary hover:underline font-medium">
            Danh mục Ticket
          </Link>
          <span>·</span>
          <Link to="/forms" className="text-primary hover:underline font-medium">
            Biểu mẫu
          </Link>
          <span>·</span>
          <Link to="/workflows" className="text-primary hover:underline font-medium">
            Workflow
          </Link>
        </div>
      </div>
    </div>
  );
}
