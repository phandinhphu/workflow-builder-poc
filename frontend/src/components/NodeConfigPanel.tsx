import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Node, Edge } from '@xyflow/react';
import { useState, useMemo } from 'react';
import DynamicValueField from './DynamicValueField';
import AssigneeResolver, { type AssigneeResolverConfig } from './AssigneeResolver';
import StructuredConditionModal from './StructuredConditionModal';
import type { StructuredConditionConfig, StructuredConditionRule } from '../types/workflow';

export interface FormField {
  id: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  readOnly?: boolean;
  visibleWhen?: string;
  outputMapping?: string;
}
import {
  CheckCircle2,
  UserPlus,
  BellRing,
  GitBranch,
  MousePointer2,
  FormInput,
  Eye,
  Code2,
  Database,
  Globe2,
  Play,
  Clock,
  Webhook,
  Users,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { useDesignerStore } from '../stores/designerStore';
import { toIsoDuration } from '../utils/duration';
import type { TriggerType } from '../types/workflow';

const TRIGGER_TYPE_OPTIONS: { value: TriggerType; label: string; icon: any }[] = [
  { value: 'manual', label: 'Kích hoạt thủ công', icon: MousePointer2 },
  { value: 'schedule', label: 'Theo lịch trình', icon: Clock },
  { value: 'form', label: 'Khi gửi biểu mẫu', icon: FormInput },
  { value: 'webhook', label: 'Theo sự kiện Webhook', icon: Webhook },
];

const MOCK_FORMS = [
  { id: 'FORM-001', name: 'Yêu cầu nghỉ phép' },
  { id: 'FORM-002', name: 'Yêu cầu mua sắm' },
  { id: 'FORM-003', name: 'Đánh giá rủi ro CNTT' },
  { id: 'FORM-004', name: 'PC Request Form' },
];

const INITIATOR_ROLES = ['HR', 'Manager', 'Finance', 'Everyone'];

const nodeConfig: Record<string, { title: string; desc: string; icon: any; color: string }> = {
  start: { title: 'TRIGGER', desc: 'Bắt đầu workflow', icon: MousePointer2, color: 'text-indigo-500' },
  approval: { title: 'PHÊ DUYỆT', desc: 'Gửi yêu cầu và chờ phê duyệt', icon: CheckCircle2, color: 'text-blue-500' },
  review: { title: 'KIỂM DUYỆT', desc: 'Đánh giá nội dung và đưa ra quyết định', icon: Eye, color: 'text-purple-500' },
  assignment: { title: 'PHÂN CÔNG & THU THẬP', desc: 'Tập hợp người tham gia qua danh bạ hoặc Excel', icon: UserPlus, color: 'text-orange-500' },
  condition: { title: 'ĐIỀU KIỆN (IF/ELSE)', desc: 'Chuyển hướng theo điều kiện', icon: GitBranch, color: 'text-emerald-500' },
  notification: { title: 'THÔNG BÁO', desc: 'Gửi thông báo tự động', icon: BellRing, color: 'text-yellow-500' },
  system: { title: 'SYSTEM ACTION', desc: 'Tự động gọi API, tạo record, cập nhật trạng thái', icon: Code2, color: 'text-gray-500' },
  data: { title: 'BẢNG DỮ LIỆU', desc: 'Truy vấn và xử lý dữ liệu có cấu trúc', icon: Database, color: 'text-teal-500' },
  http: { title: 'HTTP REQUEST', desc: 'Gọi API bên ngoài', icon: Globe2, color: 'text-cyan-500' },
  form: { title: 'BIỂU MẪU & NHẬP LIỆU', desc: 'Yêu cầu người dùng điền thông tin qua form', icon: FormInput, color: 'text-pink-500' },
  end: { title: 'KẾT THÚC', desc: 'Kết thúc luồng xử lý', icon: Play, color: 'text-red-500' },
};

const defaultAssignee: AssigneeResolverConfig = { type: 'fixed', value: '', label: '' };

type AnyRecord = Record<string, unknown>;

function ContextRefBadge({ path }: { path: string }) {
  const firstSeg = path.split('.')[0];
  const colorMap: Record<string, string> = {
    trigger: 'bg-blue-100 text-blue-700 border-blue-200',
    variables: 'bg-purple-100 text-purple-700 border-purple-200',
    nodes: 'bg-teal-100 text-teal-700 border-teal-200',
    participant: 'bg-orange-100 text-orange-700 border-orange-200',
    currentUser: 'bg-gray-100 text-gray-700 border-gray-200',
    result: 'bg-green-100 text-green-700 border-green-200',
  };
  const cn = colorMap[firstSeg] || 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono border ${cn}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
      </svg>
      {'${' + path + '}'}
    </span>
  );
}

function FormFieldPreview({ field }: { field: FormField }) {
  const isReadOnly = field.readOnly;
  return (
    <div className={`mb-3 ${isReadOnly ? 'opacity-60' : ''}`}>
      <label className="block text-sm font-medium text-navy mb-1">
        {field.label}
        {field.required && <span className="text-danger ml-1">*</span>}
      </label>
      {(() => {
        switch (field.type) {
          case 'textarea':
            return (
              <textarea
                readOnly={isReadOnly}
                rows={2}
                placeholder={field.placeholder || ''}
                defaultValue={field.defaultValue || ''}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-white resize-none focus:outline-none"
              />
            );
          case 'number':
            return (
              <input
                readOnly={isReadOnly}
                type="number"
                placeholder={field.placeholder || ''}
                defaultValue={field.defaultValue || ''}
                min={field.validation?.min}
                max={field.validation?.max}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none"
              />
            );
          case 'select':
            return (
              <select
                disabled={isReadOnly}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">Chọn...</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          case 'checkbox':
            return (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  readOnly
                  defaultChecked={field.defaultValue === 'true' || field.defaultValue === '${trigger.body.evaluationValid}'}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-600">{field.placeholder || ''}</span>
              </label>
            );
          case 'date':
            return <input readOnly={isReadOnly} type="date" className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none" />;
          case 'user-picker':
            return (
              <input
                readOnly={isReadOnly}
                type="text"
                placeholder="Chọn người dùng..."
                className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none"
              />
            );
          case 'file':
            return (
              <input
                readOnly={isReadOnly}
                type="file"
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-navy hover:file:bg-gray-100"
              />
            );
          default:
            return (
              <input
                readOnly={isReadOnly}
                type="text"
                placeholder={field.placeholder || ''}
                defaultValue={field.defaultValue || ''}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none"
              />
            );
        }
      })()}
      {field.validation && (
        <p className="text-xs text-muted mt-1">
          {field.validation.min !== undefined && field.validation.max !== undefined
            ? `Giới hạn: ${field.validation.min} - ${field.validation.max}`
            : ''}
        </p>
      )}
      {field.defaultValue && field.defaultValue.startsWith('${') && (
        <div className="mt-1">
          <ContextRefBadge path={field.defaultValue.replace(/^\$\{([^}]+)\}$/, '$1')} />
        </div>
      )}
    </div>
  );
}

function findUpstreamNodes(nodeId: string, nodes: Node[], edges: Edge[]): Node[] {
  const upstream: Node[] = [];
  const visited = new Set<string>([nodeId]);

  const incomingEdges = edges.filter(e => e.target === nodeId);
  const queue: string[] = incomingEdges.map(e => e.source);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const found = nodes.find(n => n.id === currentId);
    if (found) {
      upstream.push(found);
      const prevEdges = edges.filter(e => e.target === currentId);
      for (const pe of prevEdges) {
        if (!visited.has(pe.source)) queue.push(pe.source);
      }
    }
  }

  return upstream;
}

function InputDataTab({
  type: _type,
  data: _data,
  trigger,
  upstreamNodes,
  variables,
}: {
  type: string;
  data: AnyRecord;
  trigger?: any;
  upstreamNodes: Node[];
  variables: any[];
}) {
  return (
    <div className="p-4">
      <h4 className="text-xs font-bold text-navy uppercase mb-3">Context đầu vào khả dụng</h4>
      <div className="space-y-4">
        {trigger && (
          <div className="border border-border rounded-md p-3 bg-white">
            <p className="text-sm font-medium text-navy mb-2">Từ Trigger ({trigger.type})</p>
            <div className="flex flex-wrap gap-1">
              <ContextRefBadge path="trigger.body" />
              <ContextRefBadge path="trigger.initiator.id" />
            </div>
          </div>
        )}

        {variables.length > 0 && (
          <div className="border border-border rounded-md p-3 bg-white">
            <p className="text-sm font-medium text-navy mb-2">Biến Workflow</p>
            <div className="flex flex-wrap gap-1">
              {variables.map(v => (
                <ContextRefBadge key={v.key} path={`variables.${v.key}`} />
              ))}
            </div>
          </div>
        )}

        {upstreamNodes.length > 0 && (
          <div className="border border-border rounded-md p-3 bg-white">
            <p className="text-sm font-medium text-navy mb-2">Kết quả từ các bước trước</p>
            <div className="space-y-2">
              {upstreamNodes.map(node => {
                const nodeData = node.data as any;
                const nodeType = String(nodeData?.nodeType || nodeData?.type || (node.type === 'custom' ? '' : node.type) || '').toUpperCase();
                const nodeLabel = nodeData?.name || nodeData?.label || node.id;
                return (
                  <div key={node.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <p className="text-xs text-navy font-semibold mb-1">
                      {nodeLabel} ({nodeType})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {nodeType === 'APPROVAL' && (
                        <>
                          <ContextRefBadge path={`nodes.${node.id}.output.approved`} />
                          <ContextRefBadge path={`nodes.${node.id}.output.outcome`} />
                          <ContextRefBadge path={`nodes.${node.id}.output.comment`} />
                        </>
                      )}
                      {nodeType === 'REVIEW' && (
                        <>
                          <ContextRefBadge path={`nodes.${node.id}.output.reviewed`} />
                          <ContextRefBadge path={`nodes.${node.id}.output.outcome`} />
                        </>
                      )}
                      {nodeType === 'ASSIGNMENT' && (
                        <>
                          <ContextRefBadge path={`nodes.${node.id}.output.participantIds`} />
                          <ContextRefBadge path={`nodes.${node.id}.output.totalParticipants`} />
                        </>
                      )}
                      {nodeType === 'CONDITION' && (
                        <ContextRefBadge path={`nodes.${node.id}.output.result`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted mt-4 italic">
        Sử dụng định dạng ${'{path}'} để mapping dữ liệu trong cấu hình các trường.
      </p>
    </div>
  );
}

function PreviewTab({ type, data, formFields }: { type: string; data: AnyRecord; formFields: FormField[] }) {
  const isHumanTask = ['assignment', 'approval', 'review'].includes(type);

  if (isHumanTask && formFields.length > 0) {
    return (
      <div className="p-4 overflow-y-auto">
        <h4 className="text-xs font-bold text-navy uppercase mb-3">Form preview</h4>
        <div className="border border-border rounded-md p-4 bg-white max-w-md mx-auto">
          {String(data.formName) && <h3 className="text-lg font-bold text-navy mb-4 text-center">{String(data.formName)}</h3>}
          <div className="space-y-3">
            {formFields.map(f => (
              <FormFieldPreview key={f.id} field={f} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'notification') {
    return (
      <div className="p-4">
        <h4 className="text-xs font-bold text-navy uppercase mb-3">Thông báo preview</h4>
        <div className="max-w-md mx-auto">
          <div className="border border-border rounded-lg p-4 bg-white shadow-xs">
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
              <BellRing className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-bold text-navy">{data.title ? String(data.title) : 'Thông báo'}</p>
                <p className="text-xs text-muted">
                  {((data.channels as string[]) || [])
                    .map(ch => (ch === 'email' ? 'Email' : ch === 'inapp' ? 'In-app' : ch === 'teams' ? 'Teams' : ch))
                    .join(', ') || '—'}
                </p>
              </div>
            </div>
            <p className="text-sm text-navy whitespace-pre-wrap break-words">
              {String(data.message || data.bodyTemplate || 'Chưa có nội dung')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'system') {
    return (
      <div className="p-4">
        <h4 className="text-xs font-bold text-navy uppercase mb-3">System Action preview</h4>
        <div className="max-w-md mx-auto">
          <div className="border border-border rounded-lg p-4 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <Code2 className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-navy">{String(data.action || type)}</span>
            </div>
            {String(data.endpoint) && <p className="text-xs text-muted mb-2 break-all">{String(data.endpoint)}</p>}
            {String(data.inputMapping) && (
              <pre className="text-xs font-mono bg-gray-50 border border-border rounded p-2 whitespace-pre-wrap break-all">
                {String(data.inputMapping)}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'condition') {
    const rules = Array.isArray(data.rules) ? (data.rules as StructuredConditionRule[]) : [];
    const logic = (data.logic as string) || 'AND';
    const condition = String(data.condition || '');
    return (
      <div className="p-4">
        <h4 className="text-xs font-bold text-navy uppercase mb-3">Condition preview</h4>
        <div className="max-w-md mx-auto">
          <div className="border border-border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-navy">Điều kiện nhánh</span>
              </div>
              {rules.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  logic === 'AND' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {logic} ({rules.length} rules)
                </span>
              )}
            </div>

            {rules.length > 0 ? (
              <div className="space-y-1.5 my-2">
                {rules.map((r, i) => (
                  <div key={i} className="text-xs font-mono bg-gray-50 border border-border rounded p-2 text-navy">
                    <span className="font-bold text-blue-700">{r.field}</span>{' '}
                    <span className="text-emerald-600 font-semibold">{r.operator}</span>{' '}
                    <span className="text-purple-700">{r.value !== undefined ? String(r.value) : ''}</span>
                  </div>
                ))}
              </div>
            ) : (
              <code className="text-sm font-mono text-navy block bg-gray-50 border border-border rounded p-2 break-all whitespace-pre-wrap">
                {condition || 'Chưa có điều kiện'}
              </code>
            )}

            <div className="mt-3 flex gap-4">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded p-2 text-center">
                <span className="text-xs font-bold text-emerald-700">TRUE</span>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded p-2 text-center">
                <span className="text-xs font-bold text-red-700">FALSE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted">
      <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
      <p className="text-sm">Chưa có kết quả để hiển thị</p>
    </div>
  );
}

export default function NodeConfigPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
  canDelete = true,
}: {
  node: Node;
  onClose: () => void;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  const data = node.data as any;
  const type = (data.nodeType || node.type || '').toLowerCase();
  const config = nodeConfig[type] || {
    title: type.toUpperCase(),
    desc: 'Cấu hình node',
    icon: MousePointer2,
    color: 'text-gray-500',
  };
  const Icon = config.icon;

  const [activeTab, setActiveTab] = useState<'input' | 'config' | 'preview'>('config');
  const [conditionModalOpen, setConditionModalOpen] = useState(false);

  const setStoreTrigger = useDesignerStore(s => s.setTrigger);
  const setPanel = useDesignerStore(s => s.setPanel);
  const nodes = useDesignerStore(s => s.nodes);
  const edges = useDesignerStore(s => s.edges);
  const trigger = useDesignerStore(s => s.trigger);
  const variables = useDesignerStore(s => s.variables);
  const workflowData = useDesignerStore(s => s.workflowData);

  const executionPattern = workflowData.executionPattern || 'ON_DEMAND';

  const upstreamNodes = useMemo(() => findUpstreamNodes(node.id, nodes, edges), [node.id, nodes, edges]);

  const openTriggerLibrary = () => {
    setPanel('trigger-library');
  };

  const triggerType: TriggerType = (data.triggerType as TriggerType) || 'manual';
  const triggerConfig = (data.triggerConfig as Record<string, unknown>) || {};

  const changeTriggerType = (t: TriggerType) => {
    onUpdate({ triggerType: t, triggerConfig: {} });
    setStoreTrigger({ type: t, config: {} });
  };

  const updateTriggerConfig = (patch: Record<string, unknown>) => {
    const next = { ...triggerConfig, ...patch };
    onUpdate({ triggerConfig: next });
    setStoreTrigger({ type: triggerType, config: next });
  };

  const assignee: AssigneeResolverConfig = data.assignee || defaultAssignee;
  const setAssignee = (a: AssigneeResolverConfig) => onUpdate({ assignee: a });

  const formFields: FormField[] = data.formFields || [];

  const conditionConfig: StructuredConditionConfig = useMemo(() => ({
    logic: (data.logic as 'AND' | 'OR') || 'AND',
    rules: Array.isArray(data.rules) ? (data.rules as StructuredConditionRule[]) : [],
  }), [data.logic, data.rules]);

  const handleSaveStructuredCondition = (cfg: StructuredConditionConfig) => {
    const summaryStr = cfg.rules
      .map(r => `${r.field} ${r.operator}${r.value !== undefined && r.value !== '' ? ` ${r.value}` : ''}`)
      .join(` ${cfg.logic} `);

    onUpdate({
      logic: cfg.logic,
      rules: cfg.rules,
      condition: summaryStr,
      subLabel: `${cfg.rules.length} quy tắc (${cfg.logic})`,
    });
  };

  const channels: string[] = data.channels || ['email', 'inapp'];

  return (
    <div className="w-[440px] border-l border-border bg-white flex flex-col h-full z-10 shadow-2xl shrink-0 absolute right-0 top-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50/70">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-xs flex items-center justify-center ${config.color}`}>
            <Icon size={17} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy leading-none mb-1">{config.title}</h2>
            <p className="text-[10px] text-muted">{config.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              aria-label="Xóa node"
              title="Xóa node và các kết nối liên quan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-navy hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Đóng"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex px-4 border-b border-border bg-white">
        {['Dữ liệu đầu vào', 'Cấu hình', 'Xem trước'].map((tab, i) => {
          const keys = ['input', 'config', 'preview'];
          const active = activeTab === keys[i];
          return (
            <button
              key={keys[i]}
              onClick={() => setActiveTab(keys[i] as any)}
              className={clsx(
                'px-3 py-3 text-xs font-semibold uppercase tracking-wider relative transition-colors flex-1 text-center whitespace-nowrap',
                active ? 'text-primary' : 'text-gray-500 hover:text-navy'
              )}
            >
              {tab}
              {active && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {activeTab === 'input' && (
          <InputDataTab
            type={type}
            data={data}
            trigger={trigger}
            upstreamNodes={upstreamNodes}
            variables={variables}
          />
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
            {/* Step Name */}
            <div>
              <label className="block text-xs font-bold text-navy uppercase mb-1.5">Tên bước</label>
              <input
                type="text"
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={data.label as string}
                onChange={e => onUpdate({ label: e.target.value })}
              />
            </div>

            {/* START TRIGGER NODE */}
            {type === 'start' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy uppercase">Loại Trigger</label>
                  <button
                    onClick={openTriggerLibrary}
                    className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    Mở Trigger Library
                  </button>
                </div>

                {/* Guidance Banner based on Execution Pattern */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      Chế độ quy trình:{' '}
                      {executionPattern === 'ON_DEMAND'
                        ? 'Dịch vụ theo yêu cầu (On-Demand)'
                        : 'Chiến dịch định kỳ (Batch Campaign)'}
                    </span>
                    <p className="mt-0.5 text-indigo-700 text-[11px]">
                      {executionPattern === 'ON_DEMAND'
                        ? 'Phù hợp: Kích hoạt thủ công hoặc khi người dùng nộp yêu cầu qua Danh mục Ticket (Ticket Category).'
                        : 'Phù hợp: Chạy tự động theo lịch (Schedule) hoặc đợt khởi chạy hàng loạt.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_TYPE_OPTIONS.map(opt => {
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => changeTriggerType(opt.value)}
                        className={clsx(
                          'flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm text-left transition-colors',
                          triggerType === opt.value
                            ? 'border-primary bg-primary/5 text-primary font-medium'
                            : 'border-border bg-white text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <IconComp size={15} className={triggerType === opt.value ? 'text-primary' : 'text-gray-400'} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border space-y-3">
                  <label className="block text-xs font-bold text-navy uppercase">Cấu hình trigger</label>
                  {triggerType === 'manual' && (
                    <p className="text-xs text-muted bg-gray-50 border border-border rounded p-3">
                      Workflow được khởi chạy thủ công từ Service Catalog hoặc qua API. Không cần cấu hình thêm.
                    </p>
                  )}
                  {triggerType === 'schedule' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Tần suất</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.frequency || 'Hàng ngày')}
                          onChange={e => updateTriggerConfig({ frequency: e.target.value })}
                        >
                          <option>Hàng ngày</option>
                          <option>Hàng tuần</option>
                          <option>Theo khoảng thời gian</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Giờ chạy</span>
                        <input
                          type="time"
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.time || '08:30')}
                          onChange={e => updateTriggerConfig({ time: e.target.value })}
                        />
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">Múi giờ</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.timezone || 'Asia/Ho_Chi_Minh')}
                          onChange={e => updateTriggerConfig({ timezone: e.target.value })}
                        >
                          <option>Asia/Ho_Chi_Minh</option>
                          <option>UTC</option>
                          <option>Asia/Singapore</option>
                        </select>
                      </div>
                    </>
                  )}
                  {triggerType === 'form' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Biểu mẫu kết nối</span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String(triggerConfig.formId || '')}
                          onChange={e => updateTriggerConfig({ formId: e.target.value })}
                        >
                          <option value="">Chọn biểu mẫu...</option>
                          {MOCK_FORMS.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-xs text-muted block mb-1">
                          Người được phép khởi tạo (Allowed Initiator)
                        </span>
                        <select
                          className="w-full border border-border rounded px-3 py-2 text-sm"
                          value={String((triggerConfig.allowedInitiator as any)?.role ?? 'HR')}
                          onChange={e =>
                            updateTriggerConfig({
                              allowedInitiator: { type: 'ROLE', role: e.target.value },
                            })
                          }
                        >
                          {INITIATOR_ROLES.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {triggerType === 'webhook' && (
                    <>
                      <div>
                        <span className="text-xs text-muted block mb-1">Webhook Endpoint</span>
                        <input
                          readOnly
                          value={String(
                            triggerConfig.endpoint ||
                              `https://api.workflow-builder.local/webhooks/${node.id}`
                          )}
                          className="w-full border border-border rounded px-3 py-2 text-sm font-mono bg-gray-50 text-gray-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* DEDICATED APPROVAL NODE CONFIGURATION */}
            {type === 'approval' && (
              <div className="space-y-6">
                {/* SECTION 1: Nguồn nội dung cần duyệt */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Nội dung cần phê duyệt (Review Source)</label>
                  </div>

                  <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded text-xs text-blue-800">
                    ℹ️ <strong>Biểu mẫu Ticket (Ticket Form Data):</strong> Người duyệt sẽ xem toàn bộ biểu mẫu phiếu yêu cầu mà người tạo đơn đã nộp kèm thông tin người gửi theo Danh mục Ticket (Ticket Category).
                  </div>
                </div>

                {/* SECTION 2: Người phê duyệt */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Người phê duyệt (Approver)</label>
                  </div>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                  {assignee.type === 'each_participant_manager' && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded text-xs text-indigo-900">
                      ✨ <strong>Multi-Manager Approval:</strong> Hệ thống sẽ tạo từng task duyệt riêng gửi tới <em>Quản lý trực tiếp</em> của mỗi nhân viên đã nộp biểu mẫu. Mỗi quản lý chỉ thấy và duyệt đơn của nhân viên thuộc nhóm mình.
                    </div>
                  )}
                </div>

                {/* SECTION 3: Kết quả đầu ra & Hướng dẫn rẽ nhánh IF/ELSE */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Kết quả đầu ra & Rẽ nhánh</label>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-700">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Biến xuất tự động của Node này:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-blue-900">
                      <li>
                        <code>nodes.{node.id}.approved</code> → <strong>true / false</strong>
                      </li>
                      <li>
                        <code>nodes.{node.id}.outcome</code> → <strong>'APPROVED' / 'REJECTED'</strong>
                      </li>
                      <li>
                        <code>nodes.{node.id}.comment</code> → Ý kiến phê duyệt
                      </li>
                    </ul>
                    <div className="pt-1 text-[11px] text-slate-500 border-t border-slate-200">
                      💡 <em>Có 2 cách điều hướng:</em> Nối cổng <code>APPROVED</code> / <code>REJECTED</code> hoặc dẫn vào Node <strong>Điều kiện (IF/ELSE)</strong> với biểu thức <code>{'${nodes.' + node.id + '.approved} == true'}</code>.
                    </div>
                  </div>
                </div>

                {/* SECTION 4: SLA */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      4
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">SLA Phê duyệt & Chuyển cấp</label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-muted block mb-1">Thời hạn</span>
                      <select
                        className="w-full border border-border rounded px-2.5 py-1.5 text-xs bg-white"
                        value={toIsoDuration(data.slaDue) || 'PT24H'}
                        onChange={e => onUpdate({ slaDue: e.target.value })}
                      >
                        <option value="PT5H">5 giờ</option>
                        <option value="PT24H">24 giờ</option>
                        <option value="PT48H">48 giờ</option>
                        <option value="P7D">1 tuần</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-xs text-muted block mb-1">Xử lý quá hạn</span>
                      <select
                        className="w-full border border-border rounded px-2.5 py-1.5 text-xs bg-white"
                        value={data.slaAction || 'Nhắc nhở'}
                        onChange={e => onUpdate({ slaAction: e.target.value })}
                      >
                        <option>Nhắc nhở</option>
                        <option>Chuyển cấp</option>
                        <option>Tự động từ chối</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED REVIEW NODE CONFIGURATION */}
            {type === 'review' && (
              <div className="space-y-6">
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Nội dung cần kiểm duyệt (Review Source)</label>
                  </div>

                  <div className="p-2.5 bg-purple-50/60 border border-purple-100 rounded text-xs text-purple-800">
                    ℹ️ <strong>Biểu mẫu Ticket (Ticket Form Data):</strong> Người kiểm duyệt sẽ xem toàn bộ biểu mẫu phiếu yêu cầu từ Ticket đã nộp.
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Người kiểm duyệt (Reviewer)</label>
                  </div>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Kết quả đầu ra & Rẽ nhánh</label>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2 text-slate-700">
                    <div className="font-semibold text-slate-900">Biến xuất tự động:</div>
                    <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-purple-900">
                      <li>
                        <code>nodes.{node.id}.reviewed</code> → <strong>true / false</strong>
                      </li>
                      <li>
                        <code>nodes.{node.id}.outcome</code> → <strong>'REVIEW_COMPLETED' / 'REJECTED'</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <label className="block text-xs font-bold text-navy uppercase">SLA & Chuyển cấp</label>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="w-full border border-border rounded px-2.5 py-1.5 text-xs bg-white"
                      value={toIsoDuration(data.slaDue) || 'PT24H'}
                      onChange={e => onUpdate({ slaDue: e.target.value })}
                    >
                      <option value="PT24H">24 giờ</option>
                      <option value="PT48H">48 giờ</option>
                      <option value="P7D">1 tuần</option>
                    </select>
                    <select
                      className="w-full border border-border rounded px-2.5 py-1.5 text-xs bg-white"
                      value={data.slaAction || 'Nhắc nhở'}
                      onChange={e => onUpdate({ slaAction: e.target.value })}
                    >
                      <option>Nhắc nhở</option>
                      <option>Chuyển cấp</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED ASSIGNMENT NODE CONFIGURATION */}
            {type === 'assignment' && (
              <div className="space-y-6">
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">
                      Phương thức thu thập tập người tham gia
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ collectionMode: 'HRM_PICKER' })}
                      className={clsx(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors',
                        (data.collectionMode || 'HRM_PICKER') === 'HRM_PICKER'
                          ? 'border-orange-500 bg-orange-50/50 text-orange-900 font-semibold'
                          : 'border-border bg-white text-gray-600'
                      )}
                    >
                      <Users className="w-4 h-4 text-orange-500" />
                      Chọn từ HRM Directory
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ collectionMode: 'EXCEL_IMPORT' })}
                      className={clsx(
                        'flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors',
                        data.collectionMode === 'EXCEL_IMPORT'
                          ? 'border-orange-500 bg-orange-50/50 text-orange-900 font-semibold'
                          : 'border-border bg-white text-gray-600'
                      )}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-orange-500" />
                      Tải file Excel (.xlsx)
                    </button>
                  </div>

                  <p className="text-[11px] text-muted">
                    Node này sẽ tổng hợp danh sách ID người tham gia và cấp cho các node sau qua biến{' '}
                    <code>{'${nodes.' + node.id + '.participantIds}'}</code>.
                  </p>
                </div>

                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <label className="text-xs font-bold text-navy uppercase">Người phụ trách thu thập</label>
                  </div>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                </div>
              </div>
            )}

            {/* CONDITION (IF/ELSE) NODE */}
            {type === 'condition' && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-navy uppercase">Cấu trúc điều kiện (AST)</label>
                  {conditionConfig.rules.length > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      conditionConfig.logic === 'AND' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {conditionConfig.logic} ({conditionConfig.rules.length} quy tắc)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setConditionModalOpen(true)}
                  className="w-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-800 flex items-center justify-center gap-2 transition-colors"
                >
                  <GitBranch size={16} />
                  {conditionConfig.rules.length > 0 ? 'Chỉnh sửa điều kiện (Rules)' : 'Thiết lập điều kiện rẽ nhánh'}
                </button>

                {conditionConfig.rules.length > 0 ? (
                  <div className="space-y-1.5 mt-2">
                    {conditionConfig.rules.map((rule, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 border border-border rounded-lg text-xs flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-navy bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                            {rule.field}
                          </span>
                          <span className="text-[10px] text-gray-500 bg-gray-200/60 px-1 rounded">
                            {rule.fieldType}
                          </span>
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            {rule.operator}
                          </span>
                          {rule.value !== undefined && rule.value !== '' && (
                            <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                              {String(rule.value)}
                            </span>
                          )}
                        </div>
                        {idx < conditionConfig.rules.length - 1 && (
                          <span className="text-[10px] font-bold text-muted ml-2">
                            {conditionConfig.logic}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : data.condition ? (
                  <code className="mt-2 block bg-gray-900 text-emerald-400 border border-gray-800 rounded p-2.5 text-xs font-mono whitespace-pre-wrap break-all">
                    {data.condition}
                  </code>
                ) : null}

                <p className="mt-1 text-xs text-gray-500">
                  Nhánh TRUE sẽ được kích hoạt khi các điều kiện thỏa mãn, ngược lại rẽ nhánh FALSE.
                </p>
              </div>
            )}

            {/* NOTIFICATION NODE */}
            {type === 'notification' && (
              <div className="space-y-4">
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Người nhận</label>
                  <AssigneeResolver config={assignee} onChange={setAssignee} />
                  {assignee.type === 'each_participant' && (
                    <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded text-xs text-emerald-900">
                      ✨ <strong>Thông báo Cá nhân hóa:</strong> Thông báo sẽ gửi riêng đến từng nhân viên được phê duyệt/từ chối. Có thể dùng các biến: <code>{'{participant.name}'}</code>, <code>{'{participant.id}'}</code>, <code>{'{nodes.<nodeId>.comment}'}</code>.
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Nội dung thông báo</label>
                  <DynamicValueField
                    value={data.message || ''}
                    onChange={val => onUpdate({ message: val })}
                    placeholder="Nhập nội dung..."
                    label="Nội dung"
                  />
                </div>
                <div className="pt-4 border-t border-border">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Kênh thông báo</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['email', 'inapp', 'teams', 'webhook'] as const).map(ch => (
                      <label key={ch} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={channels.includes(ch)}
                          onChange={e => {
                            const next = e.target.checked
                              ? [...channels, ch]
                              : channels.filter(c => c !== ch);
                            onUpdate({ channels: next });
                          }}
                          className="rounded text-primary focus:ring-primary"
                        />
                        <span className="text-sm">
                          {ch === 'email' ? 'Email' : ch === 'inapp' ? 'In-app' : ch === 'teams' ? 'Teams' : 'Webhook'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SYSTEM NODE */}
            {type === 'system' && (
              <div className="pt-4 border-t border-border space-y-3">
                <label className="block text-xs font-bold text-navy uppercase mb-1.5">Hành động</label>
                <select
                  className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  value={data.action || 'Tạo record'}
                  onChange={e => onUpdate({ action: e.target.value })}
                >
                  <option>Tạo record</option>
                  <option>Cập nhật trạng thái</option>
                  <option>Gọi API nội bộ</option>
                </select>
                <div className="pt-2">
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Endpoint/Connector</label>
                  <input
                    placeholder="Tên connector hoặc URL API"
                    value={data.endpoint || ''}
                    onChange={e => onUpdate({ endpoint: e.target.value })}
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* DATA NODE */}
            {type === 'data' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Nguồn dữ liệu</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    value={data.dataSource || 'Biến workflow'}
                    onChange={e => onUpdate({ dataSource: e.target.value })}
                  >
                    <option>Biến workflow</option>
                    <option>Kết quả node trước</option>
                    <option>HTTP Response</option>
                  </select>
                </div>
              </div>
            )}

            {/* HTTP NODE */}
            {type === 'http' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1.5">Method</label>
                    <select
                      className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={data.method || 'GET'}
                      onChange={e => onUpdate({ method: e.target.value })}
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-navy uppercase mb-1.5">Auth</label>
                    <select
                      className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      value={data.auth || 'None'}
                      onChange={e => onUpdate({ auth: e.target.value })}
                    >
                      <option>None</option>
                      <option>API Key</option>
                      <option>OAuth 2.0</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">URL</label>
                  <DynamicValueField
                    value={data.url || ''}
                    onChange={val => onUpdate({ url: val })}
                    placeholder="https://api.example.com/..."
                    label="Endpoint"
                  />
                </div>
              </div>
            )}

            {/* END NODE */}
            {type === 'end' && (
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase mb-1.5">Loại kết thúc (End Outcome)</label>
                  <select
                    className="w-full border border-border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                    value={String(data.endType || 'SUCCESS')}
                    onChange={e => onUpdate({ endType: e.target.value })}
                  >
                    <option value="SUCCESS">Thành công / Phê duyệt hoàn tất (APPROVED)</option>
                    <option value="REJECTED">Từ chối / Hủy bỏ đơn (REJECTED)</option>
                  </select>
                </div>

                {data.endType === 'REJECTED' ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    ⚠️ <strong>Kết thúc Từ chối:</strong> Khi luồng xử lý tới Node này, Ticket liên kết sẽ được tự động cập nhật trạng thái là <strong>REJECTED</strong>.
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    ✅ <strong>Kết thúc Thành công:</strong> Khi luồng xử lý tới Node này, Ticket liên kết sẽ được hoàn tất và cập nhật trạng thái là <strong>APPROVED</strong>.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preview' && <PreviewTab type={type} data={data} formFields={formFields} />}
      </div>

      <StructuredConditionModal
        isOpen={conditionModalOpen}
        onClose={() => setConditionModalOpen(false)}
        config={conditionConfig}
        onSave={handleSaveStructuredCondition}
        nodeName={data.label as string}
      />
    </div>
  );
}
