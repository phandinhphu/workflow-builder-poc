import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ClockIcon, FunnelIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { workflowVersions as fallbackVersions } from '../data/mockData';
import { api } from '../api/client';
import type { WorkflowVersion } from '../types/workflow';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
}

export default function VersionHistoryModal({ isOpen, onClose, workflowId }: VersionHistoryModalProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'SUSPENDED'>('ALL');
  const [workflowVersions, setWorkflowVersions] = useState<WorkflowVersion[]>(fallbackVersions);

  useEffect(() => {
    if (!isOpen || !workflowId) return;
    api.workflows.versions(workflowId).then(items => setWorkflowVersions(items.map((item: any) => ({
      id: item.id, versionNo: item.versionNo, status: item.status, author: item.author,
      createdAt: item.publishedAt ?? item.createdAt, changes: [`Published snapshot · checksum ${String(item.checksum ?? '').slice(0, 12)}`],
    })))).catch(() => setWorkflowVersions(fallbackVersions));
  }, [isOpen, workflowId]);

  const filtered = workflowVersions.filter(v => statusFilter === 'ALL' || v.status === statusFilter);

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

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
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
              <Dialog.Panel className="relative transform bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <ClockIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <Dialog.Title as="h2" className="text-xl font-bold text-navy">
                        Version History & Change Log
                      </Dialog.Title>
                      <p className="text-xs text-muted">Ai sửa, sửa lúc nào và nội dung thay đổi của Workflow Definition.</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-gray-50/50">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FunnelIcon className="w-4 h-4 text-gray-400" /> Lọc theo trạng thái:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border border-border rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 bg-page">
                  {filtered.length === 0 ? (
                    <p className="text-center text-sm text-muted py-12">Không tìm thấy phiên bản nào</p>
                  ) : (
                    <ul className="space-y-6">
                      {filtered.map(version => (
                        <li key={version.id} className="bg-white border border-border rounded-lg p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className={clsx(
                                'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide',
                                version.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                                version.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              )}>
                                {version.status === 'DRAFT' ? 'Draft' : version.status === 'PUBLISHED' ? 'Published' : 'Suspended'}
                              </span>
                              <span className="text-sm font-mono font-bold text-navy">v{version.versionNo}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-navy">{version.author}</p>
                              <p className="text-xs text-muted">{version.createdAt}</p>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {version.changes.map((change, idx) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                {change}
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
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
