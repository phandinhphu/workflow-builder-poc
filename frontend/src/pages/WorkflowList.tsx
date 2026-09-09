import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, DocumentDuplicateIcon, PlayIcon, EllipsisVerticalIcon, PencilSquareIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import CreateWorkflowModal from '../components/CreateWorkflowModal';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { useToasts } from '../components/Toast';
import { workflows, workflowTemplates, userDisplayName, hasRunningInstances } from '../data/mockData';
import { api } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import Can from '../components/auth/Can';

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
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [myWorkflowsOnly, setMyWorkflowsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const toasts = useToasts();

  const currentUser = useAuthStore((s) => s.currentUser);

  const filteredWorkflows = workflows.filter(w => {
    const ownerName = userDisplayName(w.ownerId);
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || STATUS_LABELS[w.status] === statusFilter;
    const matchesOwner = !myWorkflowsOnly || (currentUser && w.ownerId === currentUser.id);
    return matchesSearch && matchesStatus && matchesOwner;
  });

  const filteredTemplates = workflowTemplates.filter(t => {
    return t.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const shown = activeTab === 'workflows' ? filteredWorkflows : filteredTemplates;
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
      const index = workflows.findIndex(workflow => workflow.id === deleteTarget);
      if (index >= 0) workflows.splice(index, 1);
      toasts.pushToast('success', 'Workflow đã được xóa mềm.');
      setDeleteTarget(null); setOpenMenuId(null);
    } catch (cause) { toasts.pushToast('error', cause instanceof Error ? cause.message : 'Không xóa được workflow'); }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-navy mb-1">Danh sách Workflow</h1>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden">

        <div className="flex border-b border-border">
          <button
            className={clsx("flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative", activeTab === 'workflows' ? 'text-primary' : 'text-gray-500 hover:text-navy')}
            onClick={() => { setActiveTab('workflows'); setPage(1); }}
          >
            <PlayIcon className="w-5 h-5" /> Workflows
            {activeTab === 'workflows' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
          <button
            className={clsx("flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors relative", activeTab === 'templates' ? 'text-primary' : 'text-gray-500 hover:text-navy')}
            onClick={() => { setActiveTab('templates'); setPage(1); }}
          >
            <DocumentDuplicateIcon className="w-5 h-5" /> Danh sách Template
            {activeTab === 'templates' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
        </div>

        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50 flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tên workflow, người tạo..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 text-sm border border-border rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
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
            {activeTab === 'workflows' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={myWorkflowsOnly}
                  onChange={(e) => { setMyWorkflowsOnly(e.target.checked); setPage(1); }}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Workflow của tôi
              </label>
            )}
            <Can permissions={['WORKFLOW_CREATE', 'WORKFLOW_EDIT']}>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary-dark flex items-center gap-2"
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
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Tên {activeTab === 'workflows' ? 'Workflow' : 'Template'}</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Loại</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Trạng thái</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Người tạo</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Ngày tạo</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border">Phiên bản</th>
                <th className="py-3 px-4 text-xs font-semibold text-muted uppercase tracking-wider border-b border-border text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(item => {
                const isWorkflow = activeTab === 'workflows';
                const status = isWorkflow ? (item as any).status : 'PUBLISHED';
                const creator = isWorkflow ? userDisplayName((item as any).ownerId) : 'Admin';
                const version = isWorkflow ? `v${(item as any).draftVersion}` : 'v1.0';
                const createdAt = isWorkflow ? (item as any).createdAt : '2024-11-01';
                const linkTo = isWorkflow
                  ? `/workflows/${(item as any).id}/designer`
                  : `/workflows/new/designer?template=${item.id}`;

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
                    <td className="py-3 px-4 text-sm text-gray-600">{(item as any).type || 'Approval'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
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
                            {isWorkflow && (
                              <Link
                                to={`/workflows/${(item as any).id}`}
                                onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <EyeIcon className="w-4 h-4 text-gray-400" /> Xem chi tiết
                              </Link>
                            )}
                            {isWorkflow && (
                              <Can permissions={['WORKFLOW_DELETE', 'WORKFLOW_EDIT']}>
                                <button
                                  onClick={() => confirmDelete((item as any).id)}
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 w-full text-left"
                                >
                                  <TrashIcon className="w-4 h-4" /> Xóa
                                </button>
                              </Can>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {shown.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <DocumentDuplicateIcon className="w-8 h-8 mb-2 opacity-30" />
              <p>Không tìm thấy {activeTab === 'workflows' ? 'workflow' : 'template'} nào</p>
              {activeTab === 'workflows' && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-3 text-sm text-primary hover:text-primary-dark font-medium"
                >
                  + Tạo workflow mới
                </button>
              )}
            </div>
          )}
        </div>

        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          total={shown.length}
          onChange={setPage}
          label={activeTab === 'workflows' ? 'workflow' : 'template'}
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
