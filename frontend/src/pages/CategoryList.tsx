import { useState, useEffect, useCallback } from 'react';
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  TagIcon,
  ArrowUpCircleIcon,
} from '@heroicons/react/24/outline';
import { api } from '../api/client';
import type { TicketCategorySummary, TicketCategoryDetail } from '../types/category';
import CategoryModal from '../components/CategoryModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CategoryList() {
  const [categories, setCategories] = useState<TicketCategorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [upgradingId, setUpgradingId] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategoryDetail | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  // Delete confirm state
  const [deletingCategory, setDeletingCategory] = useState<TicketCategorySummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const activeParam = statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE';
      const data = await api.ticketCategories.list(search || undefined, activeParam);
      setCategories(data);
    } catch (err) {
      console.error('Lỗi khi nạp danh sách danh mục ticket', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Open edit modal
  const handleOpenEdit = async (cat: TicketCategorySummary) => {
    try {
      setLoadingEditId(cat.id);
      const detail = await api.ticketCategories.get(cat.id);
      setEditingCategory(detail);
      setModalOpen(true);
    } catch (err) {
      console.error('Lỗi khi lấy thông tin chi tiết danh mục', err);
    } finally {
      setLoadingEditId(null);
    }
  };

  // Toggle active status
  const handleToggleActive = async (cat: TicketCategorySummary) => {
    try {
      const nextActive = !cat.isActive;
      await api.ticketCategories.toggleActive(cat.id, nextActive);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: nextActive } : c))
      );
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái danh mục', err);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    try {
      setDeleting(true);
      await api.ticketCategories.delete(deletingCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      setDeletingCategory(null);
    } catch (err) {
      console.error('Lỗi khi xóa danh mục', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleUpgradeFormVersion = async (cat: TicketCategorySummary) => {
    if (!cat.latestFormVersionId) return;
    try {
      setUpgradingId(cat.id);
      const detail = await api.ticketCategories.get(cat.id);
      await api.ticketCategories.update(cat.id, {
        name: detail.name,
        code: detail.code,
        description: detail.description,
        icon: detail.icon,
        color: detail.color,
        formVersionId: cat.latestFormVersionId,
        workflowExecutableId: detail.workflowExecutableId,
        fieldMapping: detail.fieldMapping || {},
        isActive: detail.isActive,
      });
      await loadCategories();
    } catch (err) {
      console.error('Lỗi khi nâng cấp form version', err);
      alert('Không thể nâng cấp Form version: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpgradingId(null);
    }
  };

  const activeCount = categories.filter((c) => c.isActive).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý Danh mục Ticket</h1>
              <p className="text-xs text-gray-500">
                Gắn kết FormVersion và Workflow Executable (Decoupled Binding) thành các loại yêu cầu khả dụng
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingCategory(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 hover:bg-blue-700 transition-all hover:shadow-md"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Thêm Danh mục Mới</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <FolderIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Tổng danh mục</p>
            <p className="text-xl font-bold text-gray-900">{categories.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircleIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang hoạt động</p>
            <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã danh mục..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center rounded-lg border border-gray-200 p-1 bg-gray-50/50 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Hoạt động
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-md transition-all ${statusFilter === 'INACTIVE' ? 'bg-white text-gray-700 shadow-xs font-semibold' : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              Tạm dừng
            </button>
          </div>

          <button
            onClick={() => void loadCategories()}
            title="Tải lại danh sách"
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <span>Đang tải danh sách danh mục...</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <FolderIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Chưa có danh mục nào</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Hãy tạo danh mục đầu tiên để gắn kết một Form đã publish với một Workflow quy trình tương ứng.
            </p>
            <button
              onClick={() => {
                setEditingCategory(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Tạo danh mục mới</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-6">Danh mục</th>
                  <th className="py-3.5 px-6">Biểu mẫu ghim (FormVersion)</th>
                  <th className="py-3.5 px-6">Quy trình ghim (Workflow)</th>
                  <th className="py-3.5 px-6 text-center">Field Mapping</th>
                  <th className="py-3.5 px-6 text-center">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Name and Code */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                          style={{ backgroundColor: cat.color || '#3B82F6' }}
                        >
                          <FolderIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{cat.name}</p>
                          <p className="font-mono text-[10px] text-gray-400">{cat.code}</p>
                          {cat.description && (
                            <p className="text-[11px] text-gray-500 line-clamp-1 max-w-xs mt-0.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Form Version */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <DocumentDuplicateIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{cat.formName || 'Form'}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono font-medium">
                              v{cat.formVersionNumber || 1}
                            </span>
                            {cat.hasNewerFormVersion && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold animate-pulse">
                                ⚡ Có v{cat.latestFormVersionNumber} mới
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Workflow Executable */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-800 text-xs">{cat.workflowName || 'Workflow'}</p>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono font-medium">
                            v{cat.workflowVersionNo || '1.0'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Mapped fields count */}
                    <td className="py-3.5 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-medium font-mono">
                        {cat.mappedFieldsCount} trường
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="py-3.5 px-6 text-center">
                      <button
                        onClick={() => void handleToggleActive(cat)}
                        title={cat.isActive ? 'Bấm để tạm dừng' : 'Bấm để kích hoạt'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${cat.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                        />
                        {cat.isActive ? 'Khả dụng' : 'Tạm dừng'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {cat.hasNewerFormVersion && cat.latestFormVersionId && (
                          <button
                            onClick={() => void handleUpgradeFormVersion(cat)}
                            disabled={upgradingId === cat.id}
                            title={`Cập nhật lên Form version v${cat.latestFormVersionNumber} mới nhất`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-[11px] font-bold shadow-xs hover:shadow-sm transition-all disabled:opacity-50"
                          >
                            <ArrowUpCircleIcon className={`w-3.5 h-3.5 ${upgradingId === cat.id ? 'animate-spin' : ''}`} />
                            <span>{upgradingId === cat.id ? 'Đang nâng cấp...' : `Lên v${cat.latestFormVersionNumber}`}</span>
                          </button>
                        )}

                        <button
                          onClick={() => void handleOpenEdit(cat)}
                          disabled={loadingEditId === cat.id}
                          title="Chỉnh sửa danh mục"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingCategory(cat)}
                          title="Xóa danh mục"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingCategory(null);
            void loadCategories();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        title="Xóa Danh mục Ticket"
        message={`Bạn có chắc chắn muốn xóa danh mục "${deletingCategory?.name}" (${deletingCategory?.code}) không?`}
        confirmLabel={deleting ? 'Đang xóa...' : 'Xóa danh mục'}
        cancelLabel="Hủy"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingCategory(null)}
        destructive
      />
    </div>
  );
}
