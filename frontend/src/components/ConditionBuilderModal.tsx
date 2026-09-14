import { Fragment, useState, useEffect, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircle2, XCircle, Zap, Code2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { useDesignerStore } from '../stores/designerStore';

type ConditionDataType = 'boolean' | 'string' | 'number' | 'array' | 'object' | 'date';
type ConditionOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'isNull' | 'isNotNull';

export interface ConditionRule {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string;
  type: 'literal' | 'binding';
  dataType?: ConditionDataType;
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
  nodes?: Node[];
}

interface ContextOption {
  group: 'node' | 'variable' | 'trigger' | 'context';
  groupLabel: string;
  label: string;
  path: string;
  dataType: ConditionDataType;
  description?: string;
  suggestedValues?: string[];
  sourceNodeId?: string;
}

let parsedRuleSequence = 0;

const nextParsedId = (prefix: string) => `${prefix}_${Date.now()}_${parsedRuleSequence++}`;

const unwrapOuterParentheses = (value: string): string => {
  let result = value.trim();
  while (result.startsWith('(') && result.endsWith(')')) {
    let depth = 0;
    let wrapsWholeExpression = true;
    let quote = '';
    for (let i = 0; i < result.length; i += 1) {
      const char = result[i];
      if (quote) {
        if (char === '\\') i += 1;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }
      if (char === '(') depth += 1;
      if (char === ')') {
        depth -= 1;
        if (depth === 0 && i < result.length - 1) {
          wrapsWholeExpression = false;
          break;
        }
      }
    }
    if (!wrapsWholeExpression || depth !== 0) break;
    result = result.slice(1, -1).trim();
  }
  return result;
};

const splitTopLevel = (value: string, operator: 'AND' | 'OR'): string[] => {
  const result: string[] = [];
  const symbol = operator === 'AND' ? '&&' : '||';
  let depth = 0;
  let quote = '';
  let start = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (depth !== 0) continue;

    const symbolMatch = value.slice(i, i + symbol.length) === symbol;
    const word = value.slice(i, i + operator.length);
    const wordMatch = word.toUpperCase() === operator
      && !/[A-Za-z0-9_]/.test(value[i - 1] || '')
      && !/[A-Za-z0-9_]/.test(value[i + operator.length] || '');
    if (!symbolMatch && !wordMatch) continue;

    result.push(value.slice(start, i).trim());
    i += (symbolMatch ? symbol.length : operator.length) - 1;
    start = i + 1;
  }
  if (result.length > 0) result.push(value.slice(start).trim());
  return result.filter(Boolean);
};

const splitFunctionArguments = (value: string): string[] => {
  let depth = 0;
  let quote = '';
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) return [value.slice(0, i).trim(), value.slice(i + 1).trim()];
  }
  return [value.trim()];
};

const parseValue = (rawValue: string): Pick<ConditionRule, 'value' | 'type' | 'dataType'> => {
  let value = rawValue.trim();
  if (value.startsWith('${') && value.endsWith('}')) {
    return { value: value.slice(2, -1).trim(), type: 'binding', dataType: 'string' };
  }
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    value = value.slice(1, -1);
    return { value, type: 'literal', dataType: 'string' };
  }
  if (/^(true|false)$/i.test(value)) return { value: value.toLowerCase(), type: 'literal', dataType: 'boolean' };
  if (value !== '' && !Number.isNaN(Number(value))) return { value, type: 'literal', dataType: 'number' };
  return { value, type: 'literal', dataType: 'string' };
};

const parseAtomicRule = (rawExpression: string): ConditionRule => {
  const expression = unwrapOuterParentheses(rawExpression);
  const nullFunction = expression.match(/^(isNull|isNotNull)\s*\(\s*\$\{([^}]+)\}\s*\)$/i);
  if (nullFunction) {
    return {
      id: nextParsedId('parsed'),
      field: nullFunction[2].trim(),
      operator: nullFunction[1].toLowerCase() === 'isnull' ? 'isNull' : 'isNotNull',
      value: '',
      type: 'literal',
      dataType: 'string',
    };
  }

  const functionMatch = expression.match(/^(contains|in)\s*\((.*)\)$/i);
  if (functionMatch) {
    const args = splitFunctionArguments(functionMatch[2]);
    const fieldMatch = args[0]?.match(/^\$\{([^}]+)\}$/);
    if (args.length !== 2 || !fieldMatch) throw new Error('Biểu thức hàm không thể chuyển sang chế độ trực quan');
    return {
      id: nextParsedId('parsed'),
      field: fieldMatch[1].trim(),
      operator: functionMatch[1].toLowerCase() as 'contains' | 'in',
      ...parseValue(args[1]),
    };
  }

  const match = expression.match(/^\$\{([^}]+)\}\s*(==|!=|>=|<=|>|<|contains|in)\s*(.*)$/i);
  if (!match) {
    const directReference = expression.match(/^\$\{([^}]+)\}$/);
    if (directReference) {
      return { id: nextParsedId('parsed'), field: directReference[1].trim(), operator: '==', value: 'true', type: 'literal', dataType: 'boolean' };
    }
    throw new Error('Biểu thức không thể chuyển sang chế độ trực quan');
  }

  if ((match[2] === '==' || match[2] === '!=') && match[3].trim().toLowerCase() === 'null') {
    return {
      id: nextParsedId('parsed'),
      field: match[1].trim(),
      operator: match[2] === '==' ? 'isNull' : 'isNotNull',
      value: '',
      type: 'literal',
      dataType: 'string',
    };
  }

  return {
    id: nextParsedId('parsed'),
    field: match[1].trim(),
    operator: match[2] as ConditionOperator,
    ...parseValue(match[3]),
  };
};

const parseExpressionToGroup = (expr: string): ConditionGroup => {
  if (!expr || expr.trim() === '') {
    return { id: 'root', logicalOperator: 'AND', rules: [] };
  }
  parsedRuleSequence = 0;

  const parseNode = (value: string, isRoot = false): ConditionRule | ConditionGroup => {
    const clean = unwrapOuterParentheses(value);
    const orParts = splitTopLevel(clean, 'OR');
    if (orParts.length > 1) {
      return { id: isRoot ? 'root' : nextParsedId('group'), logicalOperator: 'OR', rules: orParts.map(part => parseNode(part)) };
    }
    const andParts = splitTopLevel(clean, 'AND');
    if (andParts.length > 1) {
      return { id: isRoot ? 'root' : nextParsedId('group'), logicalOperator: 'AND', rules: andParts.map(part => parseNode(part)) };
    }
    return parseAtomicRule(clean);
  };

  const parsed = parseNode(expr, true);
  return 'logicalOperator' in parsed
    ? parsed
    : { id: 'root', logicalOperator: 'AND', rules: [parsed] };
};

const quoteLiteral = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const buildExpressionFromGroup = (group: ConditionGroup): string => {
  if (!group.rules || group.rules.length === 0) return '';

  const parts = group.rules.map(rule => {
    if ('logicalOperator' in rule) {
      const nested = buildExpressionFromGroup(rule);
      return nested ? `(${nested})` : '';
    } else {
      if (rule.operator === 'isNull') return `isNull(\${${rule.field}})`;
      if (rule.operator === 'isNotNull') return `isNotNull(\${${rule.field}})`;

      let valStr = '';
      if (rule.type === 'binding') {
        valStr = `\${${rule.value}}`;
      } else if (rule.operator === 'in') {
        valStr = quoteLiteral(rule.value);
      } else if (rule.dataType === 'boolean' || rule.value === 'true' || rule.value === 'false') {
        valStr = rule.value.toLowerCase() === 'true' ? 'true' : 'false';
      } else if (rule.dataType === 'number' || (!isNaN(Number(rule.value)) && rule.value.trim() !== '')) {
        valStr = rule.value;
      } else {
        valStr = quoteLiteral(rule.value);
      }

      if (rule.operator === 'contains' || rule.operator === 'in') {
        return `${rule.operator}(\${${rule.field}}, ${valStr})`;
      }
      return `\${${rule.field}} ${rule.operator} ${valStr}`;
    }
  }).filter(Boolean);

  const sep = group.logicalOperator === 'AND' ? ' && ' : ' || ';
  return parts.join(sep);
};

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: '==', label: 'bằng (==)' },
  { value: '!=', label: 'khác (!=)' },
  { value: '>', label: 'lớn hơn (>)' },
  { value: '>=', label: 'lớn hơn hoặc bằng (>=)' },
  { value: '<', label: 'nhỏ hơn (<)' },
  { value: '<=', label: 'nhỏ hơn hoặc bằng (<=)' },
  { value: 'contains', label: 'chứa (contains)' },
  { value: 'in', label: 'nằm trong danh sách (in)' },
  { value: 'isNull', label: 'là rỗng (is null)' },
  { value: 'isNotNull', label: 'không rỗng (not null)' },
];

const operatorsFor = (dataType: ConditionDataType | undefined): ConditionOperator[] => {
  if (dataType === 'boolean') return ['==', '!=', 'isNull', 'isNotNull'];
  if (dataType === 'number' || dataType === 'date') return ['==', '!=', '>', '>=', '<', '<=', 'in', 'isNull', 'isNotNull'];
  if (dataType === 'array') return ['contains', 'isNull', 'isNotNull'];
  if (dataType === 'object') return ['isNull', 'isNotNull'];
  return ['==', '!=', '>', '>=', '<', '<=', 'contains', 'in', 'isNull', 'isNotNull'];
};

const canonicalNodeOutputPath = (path: string) => path.replace(
  /^nodes\.([^.}\s]+)\.(?!output\.)([A-Za-z_][\w-]*)/,
  'nodes.$1.output.$2',
);

export default function ConditionBuilderModal({ isOpen, onClose, expression, onSave, nodes: availableNodes }: ConditionBuilderModalProps) {
  const { nodes: storeNodes, variables } = useDesignerStore();
  const nodes = availableNodes ?? storeNodes;
  const [rootGroup, setRootGroup] = useState<ConditionGroup>({ id: 'root', logicalOperator: 'AND', rules: [] });
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [rawExpression, setRawExpression] = useState('');

  // Context field options gathered from upstream nodes, variables, and trigger
  const contextOptions: ContextOption[] = useMemo(() => {
    const list: ContextOption[] = [];
    const seenPaths = new Set<string>();
    const addOption = (option: ContextOption) => {
      if (!seenPaths.has(option.path)) {
        seenPaths.add(option.path);
        list.push(option);
      }
    };
    const dataTypeOf = (rawType: unknown, format?: unknown): ConditionDataType => {
      const type = String(rawType ?? '').toLowerCase();
      if (type === 'boolean' || type === 'checkbox') return 'boolean';
      if (type === 'number' || type === 'integer') return 'number';
      if (type === 'array' || type === 'list') return 'array';
      if (type === 'object' || type === 'file') return 'object';
      if (type === 'date' || format === 'date' || format === 'date-time') return 'date';
      return 'string';
    };

    // 1. Upstream Nodes
    nodes.forEach(n => {
      const nodeData = n.data as any;
      const nodeType = String(nodeData?.nodeType || nodeData?.type || (n.type === 'custom' ? '' : n.type) || '').toUpperCase();
      const nodeLabel = nodeData?.name || nodeData?.label || n.id;
      const nodeGroupLabel = `Node: ${nodeLabel} (${nodeType || 'Không xác định'})`;
      const addNodeOutput = (
        key: string,
        label: string,
        dataType: ConditionDataType,
        extra: Pick<ContextOption, 'description' | 'suggestedValues'> = {},
      ) => addOption({
        group: 'node',
        groupLabel: nodeGroupLabel,
        label: `${nodeLabel} → ${label}`,
        path: `nodes.${n.id}.output.${key}`,
        dataType,
        sourceNodeId: n.id,
        ...extra,
      });

      if (nodeType === 'APPROVAL') {
        addNodeOutput('approved', 'Kết quả phê duyệt (approved)', 'boolean', { description: 'true (Đồng ý) / false (Từ chối)' });
        addNodeOutput('outcome', 'Trạng thái outcome', 'string', { description: 'APPROVED / REJECTED', suggestedValues: ['APPROVED', 'REJECTED'] });
        addNodeOutput('comment', 'Ý kiến người duyệt (comment)', 'string');
        addNodeOutput('approverId', 'Mã người duyệt (approverId)', 'string');
      } else if (nodeType === 'REVIEW') {
        addNodeOutput('reviewed', 'Kết quả kiểm duyệt (reviewed)', 'boolean', { description: 'true (Đạt) / false (Từ chối)' });
        addNodeOutput('outcome', 'Trạng thái outcome', 'string', { description: 'REVIEW_COMPLETED / REJECTED', suggestedValues: ['REVIEW_COMPLETED', 'REJECTED'] });
        addNodeOutput('comment', 'Ý kiến người kiểm duyệt (comment)', 'string');
        addNodeOutput('reviewerId', 'Mã người kiểm duyệt (reviewerId)', 'string');
      } else if (nodeType === 'ASSIGNMENT') {
        addNodeOutput('totalParticipants', 'Tổng số người tham gia', 'number');
        addNodeOutput('participantIds', 'Danh sách ID người tham gia', 'array');
        addNodeOutput('participants', 'Danh sách người tham gia', 'array');
      } else if (nodeType === 'CONDITION') {
        addNodeOutput('result', 'Kết quả điều kiện (result)', 'boolean', { description: 'true / false' });
      }

      // Form fields are valid outputs for every human-task node, not only FORM.
      const formFieldSources = [
        nodeData?.formFields,
        nodeData?.config?.formFields,
        nodeData?.formSchema?.fields,
        nodeData?.config?.formSchema?.fields,
      ];
      const formFields = formFieldSources.find(Array.isArray) || [];
      formFields.forEach((field: any) => {
        const outputKey = String(field?.outputMapping || field?.id || field?.name || '').trim();
        if (!outputKey) return;
        addNodeOutput(outputKey, `Trường biểu mẫu: ${field.label || outputKey} (${outputKey})`, dataTypeOf(field.type));
      });

      // Generic named outputs declared by a node's output schema/mapping.
      const outputSchema = nodeData?.outputSchema || nodeData?.config?.outputSchema;
      const properties = outputSchema?.properties || (outputSchema?.type ? undefined : outputSchema);
      if (properties && typeof properties === 'object' && !Array.isArray(properties)) {
        Object.entries(properties).forEach(([key, schema]: [string, any]) => {
          addNodeOutput(key, `Dữ liệu đầu ra: ${key}`, dataTypeOf(schema?.type, schema?.format), {
            description: schema?.description,
            suggestedValues: Array.isArray(schema?.enum) ? schema.enum.map(String) : undefined,
          });
        });
      }
      const outputMapping = nodeData?.outputMapping || nodeData?.config?.outputMapping;
      if (outputMapping && typeof outputMapping === 'object' && !Array.isArray(outputMapping)) {
        Object.keys(outputMapping).forEach(key => addNodeOutput(key, `Dữ liệu đầu ra: ${key}`, 'string'));
      }
    });

    // 2. Workflow Variables
    variables?.forEach(v => {
      let dt: ContextOption['dataType'] = 'string';
      if (v.dataType === 'BOOLEAN') dt = 'boolean';
      if (v.dataType === 'NUMBER') dt = 'number';
      if (v.dataType === 'ARRAY') dt = 'array';
      if (v.dataType === 'OBJECT') dt = 'object';
      if (v.dataType === 'DATE') dt = 'date';

      addOption({
        group: 'variable',
        groupLabel: 'Biến quy trình',
        label: `${v.name || v.key} (${v.key})`,
        path: `variables.${v.key}`,
        dataType: dt,
        description: v.description
      });
    });

    // 3. Trigger context
    addOption({
      group: 'trigger',
      groupLabel: 'Dữ liệu kích hoạt (Trigger)',
      label: 'Người khởi tạo (trigger.initiator.id)',
      path: 'trigger.initiator.id',
      dataType: 'string'
    });
    addOption({
      group: 'trigger',
      groupLabel: 'Dữ liệu kích hoạt (Trigger)',
      label: 'Phòng ban người khởi tạo (trigger.initiator.departmentId)',
      path: 'trigger.initiator.departmentId',
      dataType: 'string'
    });

    // 4. Participant Context
    addOption({
      group: 'context',
      groupLabel: 'Ngữ cảnh người tham gia',
      label: 'Mã người tham gia (participant.id)',
      path: 'participant.id',
      dataType: 'string'
    });
    addOption({
      group: 'context',
      groupLabel: 'Ngữ cảnh người tham gia',
      label: 'Phòng ban người tham gia (participant.departmentId)',
      path: 'participant.departmentId',
      dataType: 'string'
    });

    return list;
  }, [nodes, variables]);

  useEffect(() => {
    if (isOpen) {
      setMode('visual');
      if (expression && expression.trim() !== '') {
        try {
          const hydrateTypes = (group: ConditionGroup): ConditionGroup => ({
            ...group,
            rules: group.rules.map(rule => {
              if ('logicalOperator' in rule) return hydrateTypes(rule);
              const canonicalField = canonicalNodeOutputPath(rule.field);
              const option = contextOptions.find(item => item.path === canonicalField || item.path === rule.field);
              return { ...rule, field: option?.path || rule.field, dataType: option?.dataType || rule.dataType };
            }),
          });
          setRootGroup(hydrateTypes(parseExpressionToGroup(expression)));
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
  }, [isOpen, expression, contextOptions]);

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
      dataType: matchedOpt?.dataType || 'string',
      operator: operatorsFor(matchedOpt?.dataType)[0],
      value: '',
      type: 'literal',
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
    const defaultOption = contextOptions[0];
    const newGroup: ConditionGroup = {
      id: Date.now().toString(),
      logicalOperator: 'AND',
      rules: [
        {
          id: Date.now().toString() + '_r',
          field: defaultOption?.path || 'participant.id',
          operator: operatorsFor(defaultOption?.dataType)[0],
          value: defaultOption?.dataType === 'boolean' ? 'true' : defaultOption?.suggestedValues?.[0] || '',
          type: 'literal',
          dataType: defaultOption?.dataType || 'string'
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
    if ((rule.operator === '==' || rule.operator === '!=') && matchedOpt?.suggestedValues && matchedOpt.suggestedValues.length > 0) {
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
          type={rule.dataType === 'number' && rule.operator !== 'in' ? 'number' : 'text'}
          placeholder={rule.type === 'binding' ? 'variables.threshold' : (rule.operator === 'in' ? 'Giá trị 1, Giá trị 2' : rule.dataType === 'number' ? '0' : 'Giá trị')}
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
                      {OPERATOR_OPTIONS.filter(option => operatorsFor(rule.dataType).includes(option.value)).map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
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
                        placeholder="${nodes.approval_1.output.approved} == true && ${variables.budget} > 1000"
                      />
                      <p className="text-xs text-gray-500">
                        Cú pháp hỗ trợ: <code>{'${nodes.<nodeId>.output.<outputField>}'}</code>, <code>{'${variables.<varName>}'}</code>, <code>{'${trigger.<field>}'}</code>.
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
                      <span>Node đầu ra: <strong>{new Set(contextOptions.filter(o => o.group === 'node').map(o => o.sourceNodeId)).size}</strong></span>
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
