import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChevronRightIcon, MagnifyingGlassIcon, TagIcon, BoltIcon, CodeBracketIcon, VariableIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { mockContext } from '../data/mockData';

interface ContextExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  nodes: any[];
  trigger?: any;
  variables?: any[];
  participant?: any;
}

interface ContextItem {
  path: string;
  label: string;
  type: string;
}

function flatten(obj: any, prefix: string): ContextItem[] {
  const items: ContextItem[] = [];
  Object.entries(obj).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      items.push(...flatten(value, path));
    } else {
      items.push({ path, label: path, type: typeof value });
    }
  });
  return items;
}

export default function ContextExplorer({ isOpen, onClose, onSelect, nodes, trigger, variables }: ContextExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trigger: true,
    variables: true,
    participant: true,
    currentUser: true,
    nodes: true,
  });

  const allNodes = nodes.length > 0 ? nodes : [];
  const currentTrigger = trigger || mockContext.trigger;
  const currentVariables = variables || mockContext.variables;
  void currentVariables;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const triggerItems = flatten(currentTrigger, 'trigger');
  const nodeItems: ContextItem[] = [];
  allNodes.forEach(node => {
    if (node.output) {
      Object.entries(node.output).forEach(([key, value]) => {
        nodeItems.push({
          path: `nodes.${node.id}.output.${key}`,
          label: `${node.data?.label || node.id}.${key}`,
          type: typeof value,
        });
      });
    }
  });
  const variableItems: ContextItem[] = Array.isArray(currentVariables)
    ? currentVariables.map((v: any) => ({ path: `variables.${v.key}`, label: v.key, type: v.dataType }))
    : Object.entries(currentVariables as Record<string, unknown>).map(([key, value]) => ({
        path: `variables.${key}`,
        label: key,
        type: typeof value,
      }));
  const participantItems: ContextItem[] = [
    { path: 'participant.id', label: 'participant.id', type: 'string' },
    { path: 'participant.name', label: 'participant.name', type: 'string' },
    { path: 'participant.email', label: 'participant.email', type: 'string' },
    { path: 'participant.departmentId', label: 'participant.departmentId', type: 'string' },
    { path: 'participant.managerId', label: 'participant.managerId', type: 'string' },
  ];
  const currentUserItems: ContextItem[] = [
    { path: 'currentUser.id', label: 'currentUser.id', type: 'string' },
    { path: 'currentUser.name', label: 'currentUser.name', type: 'string' },
    { path: 'currentUser.managerId', label: 'currentUser.managerId', type: 'string' },
  ];

  const filterItems = (items: ContextItem[], term: string) => {
    if (!term) return items;
    return items.filter(item =>
      item.label.toLowerCase().includes(term.toLowerCase()) ||
      item.path.toLowerCase().includes(term.toLowerCase())
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
      case 'STRING':
        return <TagIcon className="w-3 h-3 text-primary" />;
      case 'number':
      case 'NUMBER':
        return <CodeBracketIcon className="w-3 h-3 text-orange-500" />;
      case 'boolean':
      case 'BOOLEAN':
        return <BoltIcon className="w-3 h-3 text-emerald-500" />;
      default:
        return <CodeBracketIcon className="w-3 h-3 text-gray-400" />;
    }
  };

  const renderSection = (title: string, sectionKey: string, items: ContextItem[], icon: any) => {
    const Icon = icon;
    const filtered = filterItems(items, searchTerm);
    if (filtered.length === 0) return null;

    return (
      <div key={sectionKey} className="border-b border-gray-100 last:border-0">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-2">
            <ChevronRightIcon
              className={clsx('w-4 h-4 text-gray-500 transition-transform', expandedSections[sectionKey] && 'rotate-90')}
            />
            <Icon className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-navy uppercase tracking-wide">{title}</span>
            <span className="text-xs text-muted bg-gray-200 px-1.5 py-0.5 rounded">{filtered.length}</span>
          </div>
        </button>
        {expandedSections[sectionKey] && (
          <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
            {filtered.map((item, idx) => (
              <button
                key={`${sectionKey}-${idx}`}
                onClick={() => {
                  onSelect(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded hover:bg-gray-100 transition-colors group"
              >
                {getTypeIcon(item.type)}
                <span className="text-xs font-mono text-navy truncate flex-1">{item.path}</span>
                <span className="text-[10px] text-muted">{item.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-end p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-x-full"
              enterTo="opacity-100 translate-x-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-x-0"
              leaveTo="opacity-0 translate-x-full"
            >
              <Dialog.Panel className="relative w-full max-w-sm h-full bg-white shadow-xl flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
                  <Dialog.Title as="h2" className="text-base font-bold text-navy">Chèn dữ liệu động</Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 border-b border-border bg-white">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm biến, trường..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {renderSection('Trigger', 'trigger', triggerItems, BoltIcon)}
                  {renderSection('Biến Workflow', 'variables', variableItems, VariableIcon)}
                  {renderSection('Đối tượng tham gia', 'participant', participantItems, BoltIcon)}
                  {renderSection('Người dùng hiện tại', 'currentUser', currentUserItems, BoltIcon)}
                  {renderSection('Đầu ra Node', 'nodes', nodeItems, CodeBracketIcon)}
                  {searchTerm && (
                    <p className="text-xs text-muted text-center py-4">Không tìm thấy kết quả</p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}