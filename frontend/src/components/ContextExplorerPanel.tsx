import { useState } from 'react';
import { ChevronRightIcon, MagnifyingGlassIcon, TagIcon, BoltIcon, CodeBracketIcon, VariableIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { mockContext } from '../data/mockData';
import type { Node as XYFlowNode } from '@xyflow/react';
import type { TriggerDefinition, WorkflowVariable } from '../types/workflow';

type Node = XYFlowNode;

interface ContextExplorerPanelProps {
  nodes: Node[];
  trigger?: TriggerDefinition;
  variables: WorkflowVariable[];
  onClose: () => void;
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

function getNodeOutputFields(node: Node): ContextItem[] {
  const items: ContextItem[] = [];
  const formFields = (node.data?.formFields as Array<{ outputMapping: string }> | undefined) ?? [];
  formFields.forEach(f => {
    if (f.outputMapping) {
      items.push({
        path: `nodes.${node.id}.output.${f.outputMapping}`,
        label: `${node.data?.label || node.id}.${f.outputMapping}`,
        type: 'string',
      });
    }
  });
  return items;
}

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



function renderSection(
  title: string,
  sectionKey: string,
  items: ContextItem[],
  Icon: any,
  expanded: boolean,
  onToggle: () => void,
  searchTerm: string,
  onSelect: (path: string) => void
) {
  const filtered = searchTerm
    ? items.filter(item =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.path.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;
  if (filtered.length === 0) return null;

  return (
    <div key={sectionKey} className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          <ChevronRightIcon
            className={clsx('w-4 h-4 text-gray-500 transition-transform', expanded && 'rotate-90')}
          />
          <Icon className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-navy uppercase tracking-wide">{title}</span>
          <span className="text-xs text-muted bg-gray-200 px-1.5 py-0.5 rounded">{filtered.length}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1 max-h-60 overflow-y-auto">
          {filtered.map((item, idx) => (
            <button
              key={`${sectionKey}-${idx}`}
              onClick={() => onSelect(item.path)}
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
}

export default function ContextExplorerPanel({ nodes, trigger, variables, onClose }: ContextExplorerPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    trigger: true,
    variables: true,
    participant: true,
    currentUser: true,
    nodes: true,
  });

  const currentTrigger = trigger || mockContext.trigger;
  const triggerItems = flatten(currentTrigger, 'trigger');

  const nodeItems: ContextItem[] = [];
  nodes.forEach(node => {
    nodeItems.push(...getNodeOutputFields(node));
  });

  const variableItems: ContextItem[] = Array.isArray(variables)
    ? variables.map(v => ({ path: `variables.${v.key}`, label: v.key, type: v.dataType }))
    : Object.entries(variables as Record<string, unknown>).map(([key, value]) => ({
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

  const handleSelect = (path: string) => {
    navigator.clipboard.writeText(`\${${path}}`);
    console.log('Copied to clipboard:', `\${${path}}`);
  };

  return (
    <div className="w-80 h-full bg-white border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/50">
        <h2 className="text-base font-bold text-navy">Workflow Context</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="p-3 border-b border-border bg-white">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm biến, trường..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {renderSection(
          "Trigger",
          "trigger",
          triggerItems,
          BoltIcon,
          expandedSections.trigger,
          () => setExpandedSections(prev => ({ ...prev, trigger: !prev.trigger })),
          searchTerm,
          handleSelect
        )}
        {renderSection(
          "Biến Workflow",
          "variables",
          variableItems,
          VariableIcon,
          expandedSections.variables,
          () => setExpandedSections(prev => ({ ...prev, variables: !prev.variables })),
          searchTerm,
          handleSelect
        )}
        {renderSection(
          "Đối tượng tham gia",
          "participant",
          participantItems,
          BoltIcon,
          expandedSections.participant,
          () => setExpandedSections(prev => ({ ...prev, participant: !prev.participant })),
          searchTerm,
          handleSelect
        )}
        {renderSection(
          "Người dùng hiện tại",
          "currentUser",
          currentUserItems,
          BoltIcon,
          expandedSections.currentUser,
          () => setExpandedSections(prev => ({ ...prev, currentUser: !prev.currentUser })),
          searchTerm,
          handleSelect
        )}
        {renderSection(
          "Đầu ra Node",
          "nodes",
          nodeItems,
          CodeBracketIcon,
          expandedSections.nodes,
          () => setExpandedSections(prev => ({ ...prev, nodes: !prev.nodes })),
          searchTerm,
          handleSelect
        )}
        {searchTerm && nodeItems.length === 0 && triggerItems.length === 0 && variableItems.length === 0 && (
          <p className="text-xs text-muted text-center py-4">Không tìm thấy kết quả</p>
        )}
      </div>
    </div>
  );
}
