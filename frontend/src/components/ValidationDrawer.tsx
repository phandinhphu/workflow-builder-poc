import { Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Node, Edge } from '@xyflow/react';
import type { TriggerDefinition, WorkflowVariable } from '../types/workflow';

export interface ValidationIssue {
  type: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

// These resolver types resolve from workflow context automatically and don't require a manual value selection
const NO_VALUE_RESOLVERS = ['initiator', 'creator', 'current_participant', 'participant_manager', 'creator_manager', 'department_head'];

function extractReferences(text: unknown): string[] {
  if (typeof text !== 'string') return [];
  const refs: string[] = [];
  const regex = /\$\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    refs.push(match[1].trim());
  }
  return refs;
}

function collectReferences(value: unknown, target: string[]): void {
  if (typeof value === 'string') {
    target.push(...extractReferences(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectReferences(item, target));
    return;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (String(record.kind || '').toUpperCase() === 'REFERENCE' && typeof record.path === 'string') target.push(record.path);
    Object.values(record).forEach(item => collectReferences(item, target));
  }
}

function normalizeReference(reference: string): string {
  return reference.trim().replace(/^\$\./, '').replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1');
}

export function validateWorkflow(
  nodes: Node[],
  edges: Edge[],
  options?: { trigger?: TriggerDefinition; variables?: WorkflowVariable[] },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const trigger = options?.trigger;
  const variables = options?.variables ?? [];

  // Check 0: Trigger
  if (!trigger) {
    issues.push({ type: 'error', message: 'Workflow chưa có Trigger. Hãy cấu hình trigger từ bước Bắt đầu.' });
  }

  // Check 1: Start node
  const startNodes = nodes.filter(n => n.data.nodeType === 'start');
  if (startNodes.length === 0) {
    issues.push({ type: 'error', message: 'Workflow phải có một bước Bắt đầu (Start).' });
  } else if (startNodes.length > 1) {
    issues.push({ type: 'error', message: 'Workflow chỉ được phép có một bước Bắt đầu (Start).' });
  }

  // Check 2: End node
  const endNodes = nodes.filter(n => n.data.nodeType === 'end');
  if (endNodes.length === 0) {
    issues.push({ type: 'error', message: 'Workflow phải có ít nhất một bước Kết thúc (End).' });
  }

  // Check 3: dangling nodes
  nodes.forEach(node => {
    if (node.data.nodeType === 'start') {
      const outgoing = edges.filter(e => e.source === node.id);
      if (outgoing.length === 0) {
        issues.push({ type: 'error', nodeId: node.id, message: `Bước "${node.data.label}" chưa được kết nối tới bước tiếp theo.` });
      }
    } else if (node.data.nodeType === 'end') {
      const incoming = edges.filter(e => e.target === node.id);
      if (incoming.length === 0) {
        issues.push({ type: 'error', nodeId: node.id, message: `Bước "${node.data.label}" không thể truy cập được (không có đường vào).` });
      }
    } else {
      const incoming = edges.filter(e => e.target === node.id);
      const outgoing = edges.filter(e => e.source === node.id);

      if (incoming.length === 0) {
        issues.push({ type: 'warning', nodeId: node.id, message: `Bước "${node.data.label}" không có đường vào và sẽ không bao giờ được thực thi.` });
      }
      if (outgoing.length === 0) {
        issues.push({ type: 'error', nodeId: node.id, message: `Bước "${node.data.label}" phải có đường đi tiếp (trừ bước Kết thúc).` });
      }
    }
  });

  // Check 4: node-specific configs
  nodes.forEach(node => {
    if (node.data.nodeType === 'condition' && (!node.data.condition || (node.data.condition as string).trim() === '')) {
      issues.push({ type: 'error', nodeId: node.id, message: `Bước điều kiện "${node.data.label}" chưa có biểu thức điều kiện.` });
    }

    if (node.data.nodeType === 'system' && node.data.action === 'Gọi API nội bộ' && !node.data.endpoint) {
      issues.push({ type: 'error', nodeId: node.id, message: `System Action "${node.data.label}" chưa cấu hình Endpoint.` });
    }

    if (['approval', 'review', 'assignment'].includes(node.data.nodeType as string)) {
      const assignee = node.data.assignee as any;
      if (!assignee || !assignee.type) {
        // No assignee configured at all
        issues.push({ type: 'error', nodeId: node.id, message: `Bước "${node.data.label}" chưa chọn người nhận/phê duyệt.` });
      } else if (!NO_VALUE_RESOLVERS.includes(assignee.type)) {
        // This type requires an explicit value (user id, role id, expression, etc.)
        if (!assignee.value || (typeof assignee.value === 'string' && assignee.value.trim() === '')) {
          issues.push({ type: 'error', nodeId: node.id, message: `Bước "${node.data.label}" chưa chọn người nhận/phê duyệt.` });
        }
      }
    }

    if (node.data.nodeType === 'http' && (!node.data.url || (node.data.url as string).trim() === '')) {
      issues.push({ type: 'error', nodeId: node.id, message: `HTTP Request "${node.data.label}" chưa có URL.` });
    }
  });

  // Check 5: condition paths TRUE/FALSE
  nodes.filter(n => n.data.nodeType === 'condition').forEach(node => {
    const outgoing = edges.filter(e => e.source === node.id);
    const trueEdges = outgoing.filter(e => e.sourceHandle === 'true' || !e.sourceHandle);
    const falseEdges = outgoing.filter(e => e.sourceHandle === 'false');

    if (outgoing.length < 2) {
      issues.push({ type: 'error', nodeId: node.id, message: `Bước điều kiện "${node.data.label}" cần ít nhất 2 đường đi (TRUE và FALSE).` });
    } else {
      if (trueEdges.length === 0) {
        issues.push({ type: 'error', nodeId: node.id, message: `Bước điều kiện "${node.data.label}" thiếu đường đi TRUE.` });
      }
      if (falseEdges.length === 0) {
        issues.push({ type: 'error', nodeId: node.id, message: `Bước điều kiện "${node.data.label}" thiếu đường đi FALSE.` });
      }
    }
  });

  // Check 6: dynamic references must resolve against known context
  const variableKeys = new Set(variables.map(v => v.key));
  const knownNodeIds = new Set(nodes.map(n => n.id));
  const seen = new Set<string>();
  const reverse = new Map<string, string[]>();
  edges.forEach(edge => reverse.set(edge.target, [...(reverse.get(edge.target) ?? []), edge.source]));
  const upstreamOf = (nodeId: string) => {
    const result = new Set<string>();
    const visit = (id: string) => (reverse.get(id) ?? []).forEach(parent => { if (!result.has(parent)) { result.add(parent); visit(parent); } });
    visit(nodeId);
    return result;
  };
  nodes.forEach(currentNode => {
    const refs: string[] = [];
    collectReferences(currentNode.data, refs);
    const upstream = upstreamOf(currentNode.id);
    refs.forEach(rawRef => {
      const ref = normalizeReference(rawRef);
      const key = `${currentNode.id}|${ref}`;
      if (seen.has(key)) return;
      seen.add(key);
      const firstSeg = ref.split('.')[0];
      if (firstSeg === 'variables') {
        const varKey = ref.split('.')[1];
        if (!varKey || !variableKeys.has(varKey)) {
          issues.push({ type: 'error', message: `Tham chiếu "${ref}" trỏ tới biến workflow không tồn tại.` });
        }
      } else if (firstSeg === 'nodes') {
        const parts = ref.split('.');
        const nodeId = parts[1];
        if (!nodeId || !knownNodeIds.has(nodeId)) {
          issues.push({ type: 'error', nodeId: currentNode.id, message: `Tham chiếu "${ref}" trỏ tới output của node đã bị xóa.` });
        } else if (!upstream.has(nodeId)) {
          issues.push({ type: 'error', nodeId: currentNode.id, message: `Tham chiếu "${ref}" không thuộc một bước chạy trước.` });
        } else {
          const canonical = parts[2] === 'output';
          const outputKey = canonical ? parts[3] : parts[2];
          if (!outputKey) issues.push({ type: 'error', nodeId: currentNode.id, message: `Tham chiếu "${ref}" chưa chỉ rõ output.` });
          if (!canonical) issues.push({ type: 'warning', nodeId: currentNode.id, message: `Tham chiếu cũ "${ref}" vẫn chạy nhưng nên đổi sang "nodes.${nodeId}.output.${outputKey}".` });
          const source = nodes.find(node => node.id === nodeId);
          const outputs = new Set(((source?.data.formFields as Array<{ id: string; outputMapping?: string }> | undefined) ?? []).map(field => field.outputMapping || field.id));
          if (outputs.size > 0 && outputKey && !outputs.has(outputKey)) issues.push({ type: 'error', nodeId: currentNode.id, message: `Bước "${source?.data.label || nodeId}" không có output "${outputKey}".` });
        }
      } else if (!['trigger', 'instance', 'participant', 'currentUser'].includes(firstSeg)) {
        issues.push({ type: 'error', nodeId: currentNode.id, message: `Tham chiếu "${ref}" không hợp lệ (namespace không xác định).` });
      }
    });
  });

  const hasErrors = issues.some(i => i.type === 'error');

  return {
    isValid: !hasErrors,
    issues
  };
}

interface ValidationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  result: ValidationResult | null;
  onPublish: () => void;
  onSelectIssue?: (nodeId?: string) => void;
}

export default function ValidationDrawer({ isOpen, onClose, result, onPublish, onSelectIssue }: ValidationDrawerProps) {
  if (!result) return null;

  const errors = result.issues.filter(i => i.type === 'error');
  const warnings = result.issues.filter(i => i.type === 'warning');

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="translate-x-full"
        enterTo="translate-x-0"
        leave="ease-in duration-200"
        leaveFrom="translate-x-0"
        leaveTo="translate-x-full"
      >
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </Transition.Child>

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-end p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div className="fixed right-0 top-0 bottom-0 w-[400px] border-l border-border bg-white shadow-2xl z-50 max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50">
                <h2 className="text-lg font-bold text-navy">Kết quả xác minh</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${result.isValid ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-base font-medium text-navy">
                      {result.isValid ? 'Hợp lệ' : 'Có lỗi cần sửa'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {result.isValid
                      ? 'Workflow hợp lệ. Bạn có thể publish phiên bản này ngay bây giờ.'
                      : 'Vui lòng sửa các lỗi dưới đây trước khi publish workflow.'}
                  </p>
                </div>

                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-red-800 flex items-center gap-2 mb-2">
                      <XCircleIcon className="w-4 h-5" /> Lỗi ({errors.length})
                    </h4>
                    <ul className="space-y-2">
                      {errors.map((error, idx) => (
                        <li
                          key={`err-${idx}`}
                          onClick={() => onSelectIssue?.(error.nodeId)}
                          className="text-sm text-red-700 flex items-start gap-2 cursor-pointer hover:text-red-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                          {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-2 mb-2">
                      <ExclamationTriangleIcon className="w-4 h-5" /> Cảnh báo ({warnings.length})
                    </h4>
                    <ul className="space-y-2">
                      {warnings.map((warning, idx) => (
                        <li
                          key={`warn-${idx}`}
                          onClick={() => onSelectIssue?.(warning.nodeId)}
                          className="text-sm text-yellow-700 flex items-start gap-2 cursor-pointer hover:text-yellow-900"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${result.isValid ? 'bg-primary hover:bg-primary-dark' : 'bg-gray-400 cursor-not-allowed'
                        }`}
                      onClick={() => {
                        if (result.isValid) {
                          onPublish();
                          onClose();
                        }
                      }}
                      disabled={!result.isValid}
                    >
                      Xác nhận publish
                    </button>
                    <button
                      type="button"
                      className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      onClick={onClose}
                    >
                      Đóng và tiếp tục chỉnh sửa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </div>
    </Transition.Root>
  );
}
