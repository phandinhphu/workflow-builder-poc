import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import CreateWorkflowModal from '../components/CreateWorkflowModal';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { useToasts } from '../components/Toast';
import { workflows, userDisplayName, hasRunningInstances } from '../data/mockData';
import { api, type ModuleResponse, type UserModuleAccessResponse } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import Can from '../components/auth/Can';
import {
  FALLBACK_MODULES,
  getModuleBadgeStyle,
  getModuleName,
  normalizeModuleId,
} from '../utils/moduleUtils';

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  SUSPENDED: 'Suspended',
};

function getStatusBadge(status: string) {
  return {
    PUBLISHED: 'bg-green-100 text-green-700',
    DRAFT: 'bg-gray-100 text-gray-700',
    SUSPENDED: 'bg-orange-100 text-orange-700',
  }[status] || 'bg-gray-100 text-gray-700';
}

const PAGE_SIZE = 5;

export default function WorkflowList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'ALL');
  const [myWorkflowsOnly, setMyWorkflowsOnly] = useState(searchParams.get('my') === 'true');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [modules, setModules] = useState<(ModuleResponse | UserModuleAccessResponse)[]>(FALLBACK_MODULES as any);
  const [_loadingModules, setLoadingModules] = useState(false);

  const toasts = useToasts();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  // Fetch accessible modules for current user
  useEffect(() => {
    let mounted = true;
    setLoadingModules(true);
    const fetchModulesPromise = isAdmin ? api.modules.list() : api.modules.myModules();

    fetchModulesPromise
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setModules(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load modules from API, using fallback:', err);
      })
      .finally(() => {
        if (mounted) setLoadingModules(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  // Sync state changes with URL Search Params
  const updateQueryParams = (updates: {
    search?: string;
    status?: string;
    module?: string;
    my?: boolean;
  }) => {
    const nextSearch = updates.search !== undefined ? updates.search : searchTerm;
    const nextStatus = updates.status !== undefined ? updates.status : statusFilter;
    const nextModule = updates.module !== undefined ? updates.module : moduleFilter;
    const nextMy = updates.my !== undefined ? updates.my : myWorkflowsOnly;

    const sp = new URLSearchParams();
    if (nextSearch) sp.set('search', nextSearch);
    if (nextStatus && nextStatus !== 'All') sp.set('status', nextStatus);
    if (nextModule && nextModule !== 'ALL') sp.set('module', nextModule);
    if (nextMy) sp.set('my', 'true');

    setSearchParams(sp, { replace: true });
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
    updateQueryParams({ search: value });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    updateQueryParams({ status: value });
  };

  const handleModuleChange = (value: string) => {
    setModuleFilter(value);
    setPage(1);
    updateQueryParams({ module: value });
  };

  const handleMyWorkflowsChange = (checked: boolean) => {
    setMyWorkflowsOnly(checked);
    setPage(1);
    updateQueryParams({ my: checked });
  };

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((w) => {
      const ownerName = userDisplayName(w.ownerId);
      const matchesSearch =
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ownerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || STATUS_LABELS[w.status] === statusFilter;
      const matchesOwner = !myWorkflowsOnly || (currentUser && w.ownerId === currentUser.id);

      const workflowModId = normalizeModuleId(w.module);
      const matchesModule =
        moduleFilter === 'ALL' ||
        workflowModId === moduleFilter ||
        (w.module && normalizeModuleId(w.module) === moduleFilter);

      return matchesSearch && matchesStatus && matchesOwner && matchesModule;
    });
  }, [searchTerm, statusFilter, myWorkflowsOnly, moduleFilter, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkflows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filteredWorkflows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const confirmDelete = (id: string) => {
    const running = hasRunningInstances(id);
    if (running) {
      toasts.pushToast('warning', 'Không thể xóa workflow đang có instance đang chạy.');
      return;
    }
    setDeleteTarget(id);
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.workflows.changeStatus(deleteTarget, 'DELETED');
      const index = workflows.findIndex((workflow) => workflow.id === deleteTarget);
      if (index >= 0) workflows.splice(index, 1);
      toasts.pushToast('success', 'Workflow đã được xóa mềm.');
      setDeleteTarget(null);
      setOpenMenuId(null);
    } catch (cause) {
      toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không xóa được workflow');
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-navy mb-1">Danh sách Workflow</h1>
        <p className="text-xs text-muted">Quản lý các luồng quy trình nghiệp vụ theo từng Module & Phòng ban</p>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tên workflow, người tạo..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-md w-60 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              />
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Module:</span>
              <select
                value={moduleFilter}
                onChange={(e) => handleModuleChange(e.target.value)}
                className="border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
              >
                <option value="ALL">Tất cả Module</option>
                {modules.map((m) => {
                  const id = 'moduleId' in m ? m.moduleId : m.id;
                  const name = 'moduleName' in m ? m.moduleName : m.name;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">Tất cả</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={myWorkflowsOnly}
                onChange={(e) => handleMyWorkflowsChange(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Workflow của tôi
            </label>
            <Can permissions={['WORKFLOW_CREATE', 'WORKFLOW_EDIT']}>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark flex items-center gap-2 shadow-sm transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Tạo workflow
              </button>
            </Can>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border w-10"></th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Tên Workflow</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Module</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Loại</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Người tạo</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Ngày tạo</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Phiên bản</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => {
                const status = item.status || 'DRAFT';
                const creator = userDisplayName(item.ownerId);
                const version = `v${item.draftVersion || '1.0'}`;
                const createdAt = item.createdAt || '-';
                const linkTo = `/workflows/${item.id}/designer`;
                const modId = normalizeModuleId(item.module);
                const modName = getModuleName(modId, modules);
                const modBadgeStyle = getModuleBadgeStyle(modId);

                return (
                  <tr key={item.id} className="border-b border-border hover:bg-gray-50 bg-white group">
                    <td className="py-3 px-4 text-center">
                      <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-navy">
                      <Link to={linkTo} className="hover:text-primary transition-colors">
                        {item.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${modBadgeStyle}`}
                      >
                        {modName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.type || 'Approval'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                          status
                        )}`}
                      >
                        {STATUS_LABELS[status] || 'Published'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                          {creator.charAt(0)}
                        </div>
                        {creator}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{createdAt}</td>
                    <td className="py-3 px-4 text-sm font-mono text-gray-600">{version}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="text-gray-400 hover:text-navy p-1 rounded hover:bg-gray-100"
                          aria-label="Hành động"
                        >
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg z-20 py-1">
                            <Can permissions={['WORKFLOW_EDIT']}>
                              <Link
                                to={linkTo}
                                onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <PencilSquareIcon className="w-4 h-4 text-gray-400" /> Chỉnh sửa thiết kế
                              </Link>
                            </Can>
                            <Link
                              to={`/workflows/${item.id}`}
                              onClick={() => setOpenMenuId(null)}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <EyeIcon className="w-4 h-4 text-gray-400" /> Xem chi tiết
                            </Link>
                            <Can permissions={['WORKFLOW_DELETE', 'WORKFLOW_EDIT']}>
                              <button
                                onClick={() => confirmDelete(item.id)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 w-full text-left"
                              >
                                <TrashIcon className="w-4 h-4" /> Xóa
                              </button>
                            </Can>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredWorkflows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <DocumentDuplicateIcon className="w-8 h-8 mb-2 opacity-30" />
              <p>Không tìm thấy workflow nào phù hợp với bộ lọc</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 text-sm text-primary hover:text-primary-dark font-medium"
              >
                + Tạo workflow mới
              </button>
            </div>
          )}
        </div>

        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          total={filteredWorkflows.length}
          onChange={setPage}
          label="workflow"
        />
      </div>

      {isCreateModalOpen && <CreateWorkflowModal onClose={() => setIsCreateModalOpen(false)} />}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Xóa workflow"
        message="Bạn có chắc chắn muốn xóa workflow này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
      />

      <Toast toasts={toasts.toasts} onDismiss={toasts.dismissToast} />
    </div>
  );
}
