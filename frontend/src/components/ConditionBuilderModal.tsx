import { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, XCircle, Zap, Code2 } from 'lucide-react';
import { useDesignerStore } from '../stores/designerStore';

export interface ConditionRule {
  id: string;
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'isNull' | 'isNotNull';
  value: string;
  type: 'literal' | 'binding';
  dataType?: 'boolean' | 'string' | 'number' | 'array';
}

export interface ConditionGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  rules: (ConditionRule | ConditionGroup)[];
}

interface ConditionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  expression: string;
  onSave: (expression: string) => void;
}

interface ContextOption {
  group: 'node' | 'variable' | 'trigger' | 'context';
  groupLabel: string;
  label: string;
  path: string;
  dataType: 'boolean' | 'string' | 'number' | 'array';
  description?: string;
  suggestedValues?: string[];
}

/**
 * Parse an expression string into visual rule groups.
 * Handles patterns like: ${nodes.n1.approved} == true && ${variables.amount} > 500
 */
const parseExpressionToGroup = (expr: string): ConditionGroup => {
  if (!expr || expr.trim() === '') {
    return { id: 'root', logicalOperator: 'AND', rules: [] };
  }

  const cleanExpr = expr.trim();
  const isOr = cleanExpr.includes(' || ') || cleanExpr.includes(' OR ');
  const delimiter = isOr ? (cleanExpr.includes(' || ') ? ' || ' : ' OR ') : (cleanExpr.includes(' && ') ? ' && ' : ' AND ');
  const parts = cleanExpr.split(delimiter).map(p => p.replace(/^\(|\)$/g, '').trim()).filter(Boolean);

  const rules: ConditionRule[] = parts.map((part, idx) => {
    const match = part.match(/(?:\$\{([^\}]+)\}|([a-zA-Z0-9_\.]+))\s*(==|!=|>=|<=|>|<|contains|in)\s*(.*)/);
    if (match) {
      const field = match[1] || match[2];
      const operator = match[3] as ConditionRule['operator'];
      let rawVal = (match[4] || '').trim();
      let type: 'literal' | 'binding' = 'literal';

      if (rawVal.startsWith('${') && rawVal.endsWith('}')) {
        type = 'binding';
        rawVal = rawVal.slice(2, -1);
      } else if ((rawVal.startsWith("'") && rawVal.endsWith("'")) || (rawVal.startsWith('"') && rawVal.endsWith('"'))) {
        rawVal = rawVal.slice(1, -1);
      }

      const isBool = rawVal.toLowerCase() === 'true' || rawVal.toLowerCase() === 'false' || field.endsWith('.approved') || field.endsWith('.reviewed');
      const isNum = !isNaN(Number(rawVal)) && rawVal !== '';

      return {
        id: `parsed_${Date.now()}_${idx}`,
        field: field.trim(),
        operator,
        value: rawVal,
        type,
        dataType: isBool ? 'boolean' : (isNum ? 'number' : 'string')
      };
    }

    return {
      id: `fallback_${Date.now()}_${idx}`,
      field: part.replace(/^\$\{/, '').replace(/\}$/, '').trim(),
      operator: '==',
      value: 'true',
      type: 'literal',
      dataType: 'boolean'
    };
  });

  return {
    id: 'root',
    logicalOperator: isOr ? 'OR' : 'AND',
    rules
  };
};

const buildExpressionFromGroup = (group: ConditionGroup): string => {
  if (!group.rules || group.rules.length === 0) return '';

  const parts = group.rules.map(rule => {
    if ('logicalOperator' in rule) {
      return `(${buildExpressionFromGroup(rule)})`;
    } else {
      if (rule.operator === 'isNull') return `\${${rule.field}} == null`;
      if (rule.operator === 'isNotNull') return `\${${rule.field}} != null`;

      let valStr = '';
      if (rule.type === 'binding') {
        valStr = `\${${rule.value}}`;
      } else if (rule.dataType === 'boolean' || rule.value === 'true' || rule.value === 'false') {
        valStr = rule.value.toLowerCase() === 'true' ? 'true' : 'false';
      } else if (rule.dataType === 'number' || (!isNaN(Number(rule.value)) && rule.value.trim() !== '')) {
        valStr = rule.value;
      } else {
        valStr = `'${rule.value}'`;
      }

      return `\${${rule.field}} ${rule.operator} ${valStr}`;
    }
  });

  const sep = group.logicalOperator === 'AND' ? ' && ' : ' || ';
  return parts.join(sep);
};

export default function ConditionBuilderModal({ isOpen, onClose, expression, onSave }: ConditionBuilderModalProps) {
  const { nodes, variables, trigger } = useDesignerStore();
  const [rootGroup, setRootGroup] = useState<ConditionGroup>({ id: 'root', logicalOperator: 'AND', rules: [] });
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [rawExpression, setRawExpression] = useState('');

  // Context field options gathered from upstream nodes, variables, and trigger
  const contextOptions: ContextOption[] = useMemo(() => {
    const list: ContextOption[] = [];

    // 1. Upstream Nodes
    nodes.forEach(n => {
      const nodeData = n.data as any;
      const nodeType = (nodeData?.type || n.type || '').toUpperCase();
      const nodeLabel = nodeData?.name || nodeData?.label || n.id;

      if (nodeType === 'APPROVAL') {
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Phê duyệt)`,
          label: `${nodeLabel} → Kết quả phê duyệt (approved)`,
          path: `nodes.${n.id}.approved`,
          dataType: 'boolean',
          description: 'true (Đồng ý) / false (Từ chối)'
        });
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Phê duyệt)`,
          label: `${nodeLabel} → Trạng thái outcome`,
          path: `nodes.${n.id}.outcome`,
          dataType: 'string',
          description: 'APPROVED / REJECTED',
          suggestedValues: ['APPROVED', 'REJECTED']
        });
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Phê duyệt)`,
          label: `${nodeLabel} → Ý kiến người duyệt (comment)`,
          path: `nodes.${n.id}.comment`,
          dataType: 'string'
        });
      } else if (nodeType === 'REVIEW') {
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Kiểm duyệt)`,
          label: `${nodeLabel} → Kết quả kiểm duyệt (reviewed)`,
          path: `nodes.${n.id}.reviewed`,
          dataType: 'boolean',
          description: 'true (Đạt) / false (Từ chối)'
        });
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Kiểm duyệt)`,
          label: `${nodeLabel} → Trạng thái outcome`,
          path: `nodes.${n.id}.outcome`,
          dataType: 'string',
          description: 'REVIEW_COMPLETED / REJECTED',
          suggestedValues: ['REVIEW_COMPLETED', 'REJECTED']
        });
      } else if (nodeType === 'ASSIGNMENT') {
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Tập người tham gia)`,
          label: `${nodeLabel} → Tổng số người tham gia`,
          path: `nodes.${n.id}.totalParticipants`,
          dataType: 'number'
        });
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Tập người tham gia)`,
          label: `${nodeLabel} → Danh sách ID người tham gia`,
          path: `nodes.${n.id}.participantIds`,
          dataType: 'array'
        });
      } else if (nodeType === 'FORM') {
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel} (Biểu mẫu)`,
          label: `${nodeLabel} → Tổng số phản hồi (totalSubmissions)`,
          path: `nodes.${n.id}.totalSubmissions`,
          dataType: 'number'
        });
        const formFields = nodeData?.config?.formSchema?.fields || nodeData?.formSchema?.fields || [];
        formFields.forEach((f: any) => {
          list.push({
            group: 'node',
            groupLabel: `Node: ${nodeLabel} (Biểu mẫu)`,
            label: `${nodeLabel} → Trường: ${f.label || f.name} (${f.name})`,
            path: `nodes.${n.id}.${f.name}`,
            dataType: f.type === 'number' ? 'number' : (f.type === 'boolean' || f.type === 'checkbox' ? 'boolean' : 'string')
          });
        });
      } else if (nodeType !== 'CONDITION') {
        list.push({
          group: 'node',
          groupLabel: `Node: ${nodeLabel}`,
          label: `${nodeLabel} → Trạng thái hoàn thành (status)`,
          path: `nodes.${n.id}.status`,
          dataType: 'string',
          suggestedValues: ['COMPLETED', 'FAILED']
        });
      }
    });

    // 2. Workflow Variables
    variables?.forEach(v => {
      let dt: ContextOption['dataType'] = 'string';
      if (v.dataType === 'BOOLEAN') dt = 'boolean';
      if (v.dataType === 'NUMBER') dt = 'number';
      if (v.dataType === 'ARRAY') dt = 'array';

      list.push({
        group: 'variable',
        groupLabel: 'Biến quy trình',
        label: `${v.name || v.key} (${v.key})`,
        path: `variables.${v.key}`,
        dataType: dt,
        description: v.description
      });
    });

    // 3. Trigger context
    list.push({
      group: 'trigger',
      groupLabel: 'Dữ liệu kích hoạt (Trigger)',
      label: 'Người khởi tạo (trigger.initiator.id)',
      path: 'trigger.initiator.id',
      dataType: 'string'
    });
    list.push({
      group: 'trigger',
      groupLabel: 'Dữ liệu kích hoạt (Trigger)',
      label: 'Phòng ban người khởi tạo (trigger.initiator.departmentId)',
      path: 'trigger.initiator.departmentId',
      dataType: 'string'
    });

    // 4. Participant Context
    list.push({
      group: 'context',
      groupLabel: 'Ngữ cảnh người tham gia',
      label: 'Mã người tham gia (participant.id)',
      path: 'participant.id',
      dataType: 'string'
    });
    list.push({
      group: 'context',
      groupLabel: 'Ngữ cảnh người tham gia',
      label: 'Phòng ban người tham gia (participant.departmentId)',
      path: 'participant.departmentId',
      dataType: 'string'
    });

    return list;
  }, [nodes, variables, trigger]);

  useEffect(() => {
    if (isOpen) {
      if (expression && expression.trim() !== '') {
        try {
          setRootGroup(parseExpressionToGroup(expression));
        } catch {
          setMode('code');
        }
      } else {
        const firstOpt = contextOptions[0];
        setRootGroup({
          id: 'root',
          logicalOperator: 'AND',
          rules: [
            {
              id: Date.now().toString(),
              field: firstOpt?.path || 'nodes.approval.approved',
              operator: '==',
              value: firstOpt?.dataType === 'boolean' ? 'true' : '',
              type: 'literal',
              dataType: firstOpt?.dataType || 'boolean'
            }
          ]
        });
      }
      setRawExpression(expression || '');
    }
  }, [isOpen, expression]);

  const updateRawExpression = () => {
    if (mode === 'visual') {
      setRawExpression(buildExpressionFromGroup(rootGroup));
    }
  };

  useEffect(() => {
    updateRawExpression();
  }, [rootGroup, mode]);

  const addRule = (targetGroupId: string) => {
    const defaultOpt = contextOptions.find(o => o.path.includes('approved')) || contextOptions[0];
    const newRule: ConditionRule = {
      id: Date.now().toString(),
      field: defaultOpt?.path || 'nodes.approval.approved',
      operator: '==',
      value: defaultOpt?.dataType === 'boolean' ? 'true' : '',
      type: 'literal',
      dataType: defaultOpt?.dataType || 'boolean'
    };

    const addRuleToGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === targetGroupId) {
        return { ...group, rules: [...group.rules, newRule] };
      }
      return {
        ...group,
        rules: group.rules.map(r => ('logicalOperator' in r ? addRuleToGroup(r) : r))
      };
    };

    setRootGroup(addRuleToGroup(rootGroup));
  };

  const removeRuleOrGroup = (targetId: string) => {
    if (targetId === 'root') return;

    const removeFromGroup = (group: ConditionGroup): ConditionGroup => {
      return {
        ...group,
        rules: group.rules.filter(r => r.id !== targetId).map(r => ('logicalOperator' in r ? removeFromGroup(r) : r))
      };
    };

    setRootGroup(removeFromGroup(rootGroup));
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionRule>) => {
    const updateInGroup = (group: ConditionGroup): ConditionGroup => {
      return {
        ...group,
        rules: group.rules.map(r => {
          if ('logicalOperator' in r) {
            return updateInGroup(r);
          } else if (r.id === ruleId) {
            return { ...r, ...updates };
          }
          return r;
        })
      };
    };

    setRootGroup(updateInGroup(rootGroup));
  };

  const handleFieldChange = (ruleId: string, newField: string) => {
    const matchedOpt = contextOptions.find(o => o.path === newField);
    const updates: Partial<ConditionRule> = {
      field: newField,
      dataType: matchedOpt?.dataType || 'string'
    };

    if (matchedOpt?.dataType === 'boolean') {
      updates.operator = '==';
      updates.value = 'true';
      updates.type = 'literal';
    } else if (matchedOpt?.suggestedValues && matchedOpt.suggestedValues.length > 0) {
      updates.value = matchedOpt.suggestedValues[0];
      updates.operator = '==';
    }

    updateRule(ruleId, updates);
  };

  const updateGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    const updateInGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return { ...group, ...updates };
      }
      return {
        ...group,
        rules: group.rules.map(r => ('logicalOperator' in r ? updateInGroup(r) : r))
      };
    };
    setRootGroup(updateInGroup(rootGroup));
  };

  const addGroup = (targetGroupId: string) => {
    const newGroup: ConditionGroup = {
      id: Date.now().toString(),
      logicalOperator: 'AND',
      rules: [
        {
          id: Date.now().toString() + '_r',
          field: contextOptions[0]?.path || 'context.field',
          operator: '==',
          value: 'true',
          type: 'literal',
          dataType: 'boolean'
        }
      ]
    };

    const addGroupToGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === targetGroupId) {
        return { ...group, rules: [...group.rules, newGroup] };
      }
      return {
        ...group,
        rules: group.rules.map(r => ('logicalOperator' in r ? addGroupToGroup(r) : r))
      };
    };

    setRootGroup(addGroupToGroup(rootGroup));
  };

  const renderRuleValueInput = (rule: ConditionRule) => {
    const matchedOpt = contextOptions.find(o => o.path === rule.field);

    if (rule.operator === 'isNull' || rule.operator === 'isNotNull') {
      return null;
    }

    // Boolean toggle button
    if (rule.dataType === 'boolean' || rule.field.endsWith('.approved') || rule.field.endsWith('.reviewed')) {
      const isTrue = rule.value === 'true' || rule.value === 'TRUE';
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => updateRule(rule.id, { value: 'true', type: 'literal' })}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors ${
              isTrue
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            True (Đồng ý / Đạt)
          </button>
          <button
            type="button"
            onClick={() => updateRule(rule.id, { value: 'false', type: 'literal' })}
            className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors ${
              !isTrue
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            False (Từ chối)
          </button>
        </div>
      );
    }

    // Suggested values for status / outcome
    if (matchedOpt?.suggestedValues && matchedOpt.suggestedValues.length > 0) {
      return (
        <select
          value={rule.value}
          onChange={e => updateRule(rule.id, { value: e.target.value, type: 'literal' })}
          className="block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs px-2.5 py-1.5 border bg-white"
        >
          {matchedOpt.suggestedValues.map(v => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div className="flex items-center gap-1 w-full">
        <select
          value={rule.type}
          onChange={e => updateRule(rule.id, { type: e.target.value as any, value: '' })}
          className="rounded border-gray-300 bg-gray-50 text-gray-600 text-xs px-1.5 py-1.5 border flex-shrink-0"
          title="Loại giá trị"
        >
          <option value="literal">Giá trị trực tiếp</option>
          <option value="binding">Biến/Tham chiếu</option>
        </select>
        <input
          type={rule.dataType === 'number' ? 'number' : 'text'}
          placeholder={rule.type === 'binding' ? 'variables.threshold' : (rule.dataType === 'number' ? '0' : 'Giá trị')}
          value={rule.value}
          onChange={e => updateRule(rule.id, { value: e.target.value })}
          className={`block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2.5 py-1.5 border ${
            rule.type === 'binding' ? 'font-mono bg-indigo-50/50 text-indigo-900' : ''
          }`}
        />
      </div>
    );
  };

  const renderGroup = (group: ConditionGroup, depth: number = 0) => {
    return (
      <div
        key={group.id}
        className={`p-4 rounded-lg border transition-all ${
          depth === 0 ? 'border-transparent bg-white' : 'border-gray-200 bg-gray-50/70 mt-2 shadow-xs'
        } relative`}
      >
        {depth > 0 && (
          <button
            type="button"
            onClick={() => removeRuleOrGroup(group.id)}
            className="absolute -right-2 -top-2 bg-white rounded-full text-gray-400 hover:text-red-600 border border-gray-200 shadow-xs p-1"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center gap-2 mb-3">
          <select
            value={group.logicalOperator}
            onChange={e => updateGroup(group.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
            className="rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold py-1 px-2.5 focus:ring-indigo-500"
          >
            <option value="AND">VÀ (AND)</option>
            <option value="OR">HOẶC (OR)</option>
          </select>
          <span className="text-xs text-gray-600 font-medium">
            Khớp {group.logicalOperator === 'AND' ? 'tất cả' : 'bất kỳ'} các quy tắc bên dưới:
          </span>
        </div>

        <div className="pl-3 sm:pl-4 border-l-2 border-indigo-100 space-y-2.5">
          {group.rules.map(ruleOrGroup => {
            if ('logicalOperator' in ruleOrGroup) {
              return renderGroup(ruleOrGroup, depth + 1);
            } else {
              const rule = ruleOrGroup as ConditionRule;
              return (
                <div
                  key={rule.id}
                  className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-lg border border-gray-200/80 shadow-xs hover:border-gray-300 transition-colors"
                >
                  {/* Context Field Dropdown */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="relative">
                      <select
                        value={rule.field}
                        onChange={e => handleFieldChange(rule.id, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border font-mono bg-white"
                      >
                        <optgroup label="📋 Node trong quy trình">
                          {contextOptions
                            .filter(o => o.group === 'node')
                            .map(opt => (
                              <option key={opt.path} value={opt.path}>
                                {opt.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="📦 Biến quy trình (Variables)">
                          {contextOptions
                            .filter(o => o.group === 'variable')
                            .map(opt => (
                              <option key={opt.path} value={opt.path}>
                                {opt.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="⚡ Dữ liệu khởi tạo (Trigger)">
                          {contextOptions
                            .filter(o => o.group === 'trigger')
                            .map(opt => (
                              <option key={opt.path} value={opt.path}>
                                {opt.label}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="👤 Ngữ cảnh người tham gia (Actor)">
                          {contextOptions
                            .filter(o => o.group === 'context')
                            .map(opt => (
                              <option key={opt.path} value={opt.path}>
                                {opt.label}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Operator */}
                  <div className="w-32">
                    <select
                      value={rule.operator}
                      onChange={e => updateRule(rule.id, { operator: e.target.value as any })}
                      className="block w-full rounded-md border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-indigo-500 text-xs px-2 py-1.5 border bg-white"
                    >
                      <option value="==">bằng (==)</option>
                      <option value="!=">khác (!=)</option>
                      <option value=">">lớn hơn (&gt;)</option>
                      <option value=">=">lớn hơn hoặc bằng (&gt;=)</option>
                      <option value="<">nhỏ hơn (&lt;)</option>
                      <option value="<=">nhỏ hơn hoặc bằng (&lt;=)</option>
                      <option value="contains">chứa (contains)</option>
                      <option value="in">nằm trong (in list)</option>
                      <option value="isNull">là rỗng (is null)</option>
                      <option value="isNotNull">không rỗng (not null)</option>
                    </select>
                  </div>

                  {/* Value input */}
                  <div className="flex-1 min-w-[180px] flex items-center gap-1">
                    {renderRuleValueInput(rule)}
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => removeRuleOrGroup(rule.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100 transition-colors"
                    title="Xóa điều kiện"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            }
          })}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => addRule(group.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" /> Thêm quy tắc điều kiện
            </button>
            <button
              type="button"
              onClick={() => addGroup(group.id)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" /> Thêm nhóm con (Group)
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleSave = () => {
    const finalExpr = mode === 'visual' ? buildExpressionFromGroup(rootGroup) : rawExpression;
    onSave(finalExpr);
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white px-5 pb-5 pt-5 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 flex flex-col max-h-[90vh]">
                <div className="absolute right-0 top-0 hidden pr-5 pt-5 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-hidden"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start flex-shrink-0 border-b border-gray-100 pb-4">
                  <div className="mt-1 text-center sm:mt-0 sm:text-left w-full flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        Trình tạo điều kiện rẽ nhánh (Condition Builder)
                      </Dialog.Title>
                      <p className="mt-1 text-xs text-gray-500">
                        Chọn trường dữ liệu từ các Node trước (Phê duyệt, Form, Biến) để quyết định luồng rẽ nhánh IF/ELSE.
                      </p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setMode('visual')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          mode === 'visual'
                            ? 'bg-white shadow-xs text-indigo-600'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Trực quan (Visual)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('code')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                          mode === 'code'
                            ? 'bg-white shadow-xs text-indigo-600'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        Biểu thức Code
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-y-auto flex-1 pr-1">
                  {mode === 'visual' ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/40">
                      {renderGroup(rootGroup)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={8}
                        className="block w-full rounded-lg border-gray-300 shadow-inner focus:border-indigo-500 focus:ring-indigo-500 text-xs font-mono p-4 bg-gray-900 text-emerald-400 leading-relaxed"
                        value={rawExpression}
                        onChange={e => setRawExpression(e.target.value)}
                        placeholder="${nodes.approval_1.approved} == true && ${variables.budget} > 1000"
                      />
                      <p className="text-xs text-gray-500">
                        Cú pháp hỗ trợ: <code>{'${nodes.<nodeId>.<outputField>}'}</code>, <code>{'${variables.<varName>}'}</code>, <code>{'${trigger.<field>}'}</code>.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-800">Biểu thức xuất:</span>
                      <code className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-medium">
                        {mode === 'visual' ? buildExpressionFromGroup(rootGroup) || '(trống)' : rawExpression || '(trống)'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Node đầu ra: <strong>{contextOptions.filter(o => o.group === 'node').length}</strong></span>
                      <span>•</span>
                      <span>Biến: <strong>{variables?.length || 0}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse flex-shrink-0 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors sm:ml-3 sm:w-auto"
                    onClick={handleSave}
                  >
                    Áp dụng điều kiện
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Hủy bỏ
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