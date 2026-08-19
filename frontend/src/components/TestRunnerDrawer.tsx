import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlayIcon, CheckCircleIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import type { Node, Edge } from '@xyflow/react';
import clsx from 'clsx';
import { orgUsers, findUser } from '../data/mockData';
import type { TriggerDefinition, WorkflowVariable } from '../types/workflow';

interface TestRunnerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  trigger?: TriggerDefinition;
  variables: WorkflowVariable[];
}

interface RunStep {
  nodeId: string;
  label: string;
  nodeType: string;
  assignee?: string;
  message?: string;
  form?: { name: string; fieldCount: number };
  condition?: { expression: string; result: boolean };
}

function get(ctx: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function substitute(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, path: string) => formatValue(get(ctx, path.trim())));
}

function splitTopLevel(input: string, separator: 'AND' | 'OR'): string[] {
  const parts: string[] = [];
  let depth = 0;
  const tokens = input.split(new RegExp(`\\s+${separator}\\s+`));
  // rebuild respecting parens
  const buffer: string[] = [];
  for (const tok of tokens) {
    const opens = (tok.match(/\(/g) || []).length;
    const closes = (tok.match(/\)/g) || []).length;
    depth += opens - closes;
    buffer.push(tok);
    if (depth <= 0) {
      parts.push(buffer.join(` ${separator} `));
      buffer.length = 0;
      depth = 0;
    }
  }
  if (buffer.length > 0) parts.push(buffer.join(` ${separator} `));
  return parts.map(p => p.trim()).filter(Boolean);
}

function unwrapParens(expr: string): string {
  let s = expr.trim();
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let closesAtEnd = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0 && i < s.length - 1) { closesAtEnd = false; break; }
      }
    }
    if (!closesAtEnd) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

function evaluateAtomic(expr: string, ctx: Record<string, unknown>): boolean {
  const match = expr.match(/^\$\{([^}]+)\}\s*(==|!=|>=|<=|>|<|contains|in|isNull|isNotNull)\s*(.*)$/);
  if (!match) return expr.length > 0;
  const [, path, op, rawRhs] = match;
  const lhs = get(ctx, path.trim());

  if (op === 'isNull') return lhs === null || lhs === undefined || lhs === '';
  if (op === 'isNotNull') return !(lhs === null || lhs === undefined || lhs === '');

  let rhs: unknown;
  const rhsTrim = rawRhs.trim();
  if (rhsTrim.startsWith('${')) {
    rhs = get(ctx, rhsTrim.slice(2, -1).trim());
  } else if (/^".*"$/.test(rhsTrim) || /^'.*'$/.test(rhsTrim)) {
    rhs = rhsTrim.slice(1, -1);
  } else if (rhsTrim !== '' && !Number.isNaN(Number(rhsTrim))) {
    rhs = Number(rhsTrim);
  } else {
    rhs = rhsTrim;
  }

  switch (op) {
    case '==': return lhs == rhs;
    case '!=': return lhs != rhs;
    case '>':
      if (typeof lhs === 'number' && typeof rhs === 'number') return lhs > rhs;
      return String(lhs ?? '') > String(rhs ?? '');
    case '>=':
      if (typeof lhs === 'number' && typeof rhs === 'number') return lhs >= rhs;
      return String(lhs ?? '') >= String(rhs ?? '');
    case '<':
      if (typeof lhs === 'number' && typeof rhs === 'number') return lhs < rhs;
      return String(lhs ?? '') < String(rhs ?? '');
    case '<=':
      if (typeof lhs === 'number' && typeof rhs === 'number') return lhs <= rhs;
      return String(lhs ?? '') <= String(rhs ?? '');
    case 'contains': return String(lhs ?? '').includes(String(rhs ?? ''));
    case 'in': {
      const list = Array.isArray(rhs) ? rhs : String(rhs ?? '').split(',').map(s => s.trim());
      return list.some(item => item == lhs);
    }
    default: return false;
  }
}

function evaluate(expr: string, ctx: Record<string, unknown>): boolean {
  let s = unwrapParens(expr.trim());
  if (!s) return true;
  const orParts = splitTopLevel(s, 'OR');
  if (orParts.length > 1) return orParts.some(p => evaluate(p, ctx));
  const andParts = splitTopLevel(s, 'AND');
  if (andParts.length > 1) return andParts.every(p => evaluate(p, ctx));
  return evaluateAtomic(s, ctx);
}

export default function TestRunnerDrawer({ isOpen, onClose, nodes, edges, trigger: _trigger, variables }: TestRunnerDrawerProps) {
  const [triggerPayload, setTriggerPayload] = useState(() => JSON.stringify({
    body: {
      requesterId: 'U001',
      evaluationValid: false,
      selfScore: 8,
      selfAchievements: 'Hoàn thành KPI quý, dẫn đầu team về doanh thu',
    },
  }, null, 2));
  const [variableValues, setVariableValues] = useState('');
  const [participantId, setParticipantId] = useState('U003');
  const [runResult, setRunResult] = useState<RunStep[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const participant = useMemo(() => findUser(participantId), [participantId]);

  const buildContext = (): Record<string, unknown> | null => {
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(triggerPayload || '{}');
    } catch {
      setRunError('Trigger payload không phải JSON hợp lệ.');
      return null;
    }
    const vars: Record<string, unknown> = {};
    if (variableValues.trim()) {
      try {
        Object.assign(vars, JSON.parse(variableValues));
      } catch {
        setRunError('Giá trị biến không phải JSON hợp lệ (dạng {"key": value}).');
        return null;
      }
    } else {
      variables.forEach(v => {
        if (v.defaultValue?.kind === 'CONSTANT') vars[v.key] = v.defaultValue.value;
      });
    }
    return {
      trigger: parsedPayload,
      variables: vars,
      nodes: {},
      participant: participant
        ? { id: participant.id, name: participant.displayName, departmentId: participant.department, managerId: participant.managerId, managerName: participant.managerId ? findUser(participant.managerId)?.displayName : undefined, email: participant.email }
        : {},
      currentUser: { id: 'U000' },
    };
  };

  const runTest = () => {
    setRunError(null);
    const ctx = buildContext();
    if (!ctx) return;
    const startNode = nodes.find(n => n.data.nodeType === 'start');
    if (!startNode) {
      setRunError('Không tìm thấy bước Bắt đầu để chạy mô phỏng.');
      return;
    }

    const steps: RunStep[] = [];
    const visited = new Set<string>();
    const queue: Node[] = [startNode];

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      const data = node.data as Record<string, unknown>;
      const step: RunStep = { nodeId: node.id, label: String(data.label ?? ''), nodeType: String(data.nodeType ?? '') };

      const assignee = data.assignee as any;
      if (assignee) {
        if (assignee.type === 'fixed') step.assignee = findUser(assignee.value)?.displayName ?? '—';
        else if (assignee.type === 'role') step.assignee = `${assignee.label || assignee.value} (role)`;
        else if (assignee.type === 'group') step.assignee = `${assignee.label || assignee.value} (group)`;
        else if (assignee.type === 'current_participant') step.assignee = (ctx.participant as any)?.name ?? 'participant';
        else if (assignee.type === 'participant_manager') step.assignee = (ctx.participant as any)?.managerName ?? '—';
        else if (assignee.type === 'creator_manager') step.assignee = `Quản lý của ${findUser(String((ctx.trigger as any)?.body?.requesterId ?? ''))?.displayName ?? (ctx.trigger as any)?.body?.requesterId ?? '—'}`;
        else if (assignee.type === 'department_head') step.assignee = 'Trưởng phòng ban (resolve org)';
        else if (assignee.type === 'dynamic') step.assignee = substitute(String(assignee.value ?? ''), ctx);
      }

      const formFields = Array.isArray(data.formFields) ? (data.formFields as any[]) : [];
      if (formFields.length > 0 || data.formName) {
        step.form = {
          name: String(data.formName || 'Biểu mẫu'),
          fieldCount: formFields.length,
        };
        const outputs: Record<string, unknown> = {};
        formFields.forEach(f => {
          if (!f.outputMapping) return;
          let value: unknown = f.defaultValue ?? '';
          if (!value || String(value).startsWith('${')) {
            const body = (ctx.trigger as any)?.body ?? {};
            value = body[f.outputMapping] ?? value;
          }
          outputs[f.outputMapping] = value;
        });
        (ctx.nodes as Record<string, unknown>)[node.id] = outputs;
      }

      if (typeof data.message === 'string') step.message = substitute(data.message, ctx);
      if (typeof data.title === 'string') step.message = `${step.message ?? ''} ${substitute(data.title, ctx)}`.trim();

      let nextIds: string[] = [];
      const outgoing = edges.filter(e => e.source === node.id);
      if (data.nodeType === 'condition') {
        const expr = String(data.condition ?? '');
        const result = expr ? evaluate(expr, ctx) : true;
        step.condition = { expression: expr || '(trống → TRUE)', result };
        nextIds = outgoing.filter(e => (e.sourceHandle ?? 'true') === (result ? 'true' : 'false')).map(e => e.target);
        if (nextIds.length === 0) nextIds = outgoing.map(e => e.target);
      } else {
        nextIds = outgoing.map(e => e.target);
      }
      steps.push(step);
      nextIds.forEach(id => {
        const n = nodes.find(x => x.id === id);
        if (n && !visited.has(n.id)) queue.push(n);
      });
    }
    setRunResult(steps);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[85]" open={isOpen} onClose={onClose}>
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
              <Dialog.Panel className="w-[460px] h-full max-h-[calc(100vh-2rem)] bg-white shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gray-50">
                  <div>
                    <Dialog.Title as="h2" className="text-lg font-bold text-navy">Kiểm thử workflow</Dialog.Title>
                    <p className="text-xs text-muted mt-0.5">Mô phỏng bằng context mẫu — không tạo instance production.</p>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors" aria-label="Đóng">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-page">
                  <section className="bg-white border border-border rounded-lg p-4">
                    <h3 className="text-sm font-bold text-navy mb-2">Sample Trigger Payload</h3>
                    <textarea
                      rows={7}
                      value={triggerPayload}
                      onChange={e => setTriggerPayload(e.target.value)}
                      className="w-full border border-border rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
                    />
                  </section>

                  <section className="bg-white border border-border rounded-lg p-4">
                    <h3 className="text-sm font-bold text-navy mb-2">Workflow Variables</h3>
                    {variables.length === 0 ? (
                      <p className="text-xs text-muted">Chưa có biến workflow. (JSON dạng {"{"}&quot;key&quot;: value{"}"} — bỏ trống để dùng giá trị mặc định)</p>
                    ) : (
                      <p className="text-xs text-muted mb-2">Bỏ trống để dùng giá trị mặc định: {variables.map(v => `${v.key}=${v.defaultValue?.kind === 'CONSTANT' ? String(v.defaultValue.value) : '—'}`).join(', ')}</p>
                    )}
                    <textarea
                      rows={4}
                      value={variableValues}
                      onChange={e => setVariableValues(e.target.value)}
                      placeholder='{"threshold": 15000000, "period": "Q3-2024"}'
                      className="w-full border border-border rounded-md p-3 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50"
                    />
                  </section>

                  <section className="bg-white border border-border rounded-lg p-4">
                    <h3 className="text-sm font-bold text-navy mb-2">Participant mẫu</h3>
                    <select
                      value={participantId}
                      onChange={e => setParticipantId(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {orgUsers.map(u => <option key={u.id} value={u.id}>{u.displayName} — {u.role}</option>)}
                    </select>
                    {participant?.managerId && (
                      <p className="mt-1.5 text-xs text-muted">Manager: {findUser(participant.managerId)?.displayName ?? '—'}</p>
                    )}
                  </section>

                  {runError && (
                    <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs text-red-700">{runError}</div>
                  )}

                  {runResult && runResult.length > 0 && (
                    <section className="bg-white border border-border rounded-lg p-4">
                      <h3 className="text-sm font-bold text-navy mb-3">Kết quả mô phỏng ({runResult.length} bước)</h3>
                      <ol className="space-y-2.5">
                        {runResult.map((step, idx) => (
                          <li key={`${step.nodeId}-${idx}`} className="flex items-start gap-2.5">
                            <div className={clsx(
                              'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                              step.nodeType === 'condition' ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'
                            )}>
                              {step.nodeType === 'condition' ? <ArrowPathIcon className="w-3.5 h-3.5" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy">{idx + 1}. {step.label}</p>
                              {step.condition && (
                                <p className={clsx('text-xs mt-0.5', step.condition.result ? 'text-emerald-700' : 'text-red-600')}>
                                  Điều kiện: {step.condition.expression} → {step.condition.result ? 'TRUE' : 'FALSE'}
                                </p>
                              )}
                              {step.assignee && (
                                <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" /> {step.assignee}
                                </p>
                              )}
                              {step.form && (
                                <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                                  <PlayIcon className="w-3 h-3" /> Form: {step.form.name} ({step.form.fieldCount} trường)
                                </p>
                              )}
                              {step.message && <p className="text-xs text-muted mt-0.5 break-words">{step.message}</p>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  )}
                </div>

                <div className="px-5 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={runTest}
                    className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark flex items-center gap-2"
                  >
                    <PlayIcon className="w-4 h-4" /> Chạy kiểm thử
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