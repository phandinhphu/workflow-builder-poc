import type { ConditionFieldType, ConditionOperator } from '../types/workflow';

export interface OperatorMeta {
  value: ConditionOperator;
  label: string;
  symbol?: string;
  requiresValue?: boolean;
  isRange?: boolean;
}

export const OPERATOR_METAS: Record<ConditionOperator, OperatorMeta> = {
  EQUALS: { value: 'EQUALS', label: 'Bằng (=)', symbol: '==' },
  NOT_EQUALS: { value: 'NOT_EQUALS', label: 'Khác (!=)', symbol: '!=' },
  GREATER_THAN: { value: 'GREATER_THAN', label: 'Lớn hơn (>)', symbol: '>' },
  LESS_THAN: { value: 'LESS_THAN', label: 'Nhỏ hơn (<)', symbol: '<' },
  GREATER_THAN_OR_EQUAL: { value: 'GREATER_THAN_OR_EQUAL', label: 'Lớn hơn hoặc bằng (>=)', symbol: '>=' },
  LESS_THAN_OR_EQUAL: { value: 'LESS_THAN_OR_EQUAL', label: 'Nhỏ hơn hoặc bằng (<=)', symbol: '<=' },
  BETWEEN: { value: 'BETWEEN', label: 'Nằm trong khoảng (BETWEEN)', isRange: true },
  CONTAINS: { value: 'CONTAINS', label: 'Chứa ký tự (CONTAINS)' },
  STARTS_WITH: { value: 'STARTS_WITH', label: 'Bắt đầu bằng (STARTS_WITH)' },
  IS_EMPTY: { value: 'IS_EMPTY', label: 'Để trống (IS_EMPTY)', requiresValue: false },
  IS_NOT_EMPTY: { value: 'IS_NOT_EMPTY', label: 'Không để trống (IS_NOT_EMPTY)', requiresValue: false },
  IS_TRUE: { value: 'IS_TRUE', label: 'Đúng (IS_TRUE / Checked)', requiresValue: false },
  IS_FALSE: { value: 'IS_FALSE', label: 'Sai (IS_FALSE / Unchecked)', requiresValue: false },
  BEFORE: { value: 'BEFORE', label: 'Trước ngày (BEFORE)' },
  AFTER: { value: 'AFTER', label: 'Sau ngày (AFTER)' },
  IN: { value: 'IN', label: 'Thuộc danh sách (IN)' },
  NOT_IN: { value: 'NOT_IN', label: 'Không thuộc danh sách (NOT IN)' },
  CONTAINS_ANY: { value: 'CONTAINS_ANY', label: 'Chứa một trong các (CONTAINS ANY)' },
  CONTAINS_ALL: { value: 'CONTAINS_ALL', label: 'Chứa tất cả các (CONTAINS ALL)' },
};

/**
 * Matrix mapping FieldType to valid Condition Operators
 * According to Section 3.2 in Architecture Specification
 */
export const FIELD_TYPE_OPERATORS: Record<ConditionFieldType, ConditionOperator[]> = {
  number: [
    'EQUALS',
    'NOT_EQUALS',
    'GREATER_THAN',
    'LESS_THAN',
    'GREATER_THAN_OR_EQUAL',
    'LESS_THAN_OR_EQUAL',
    'BETWEEN',
  ],
  string: [
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'STARTS_WITH',
    'IS_EMPTY',
    'IS_NOT_EMPTY',
  ],
  textarea: [
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'STARTS_WITH',
    'IS_EMPTY',
    'IS_NOT_EMPTY',
  ],
  boolean: [
    'IS_TRUE',
    'IS_FALSE',
    'EQUALS',
    'NOT_EQUALS',
  ],
  date: [
    'BEFORE',
    'AFTER',
    'EQUALS',
    'BETWEEN',
  ],
  datetime: [
    'BEFORE',
    'AFTER',
    'EQUALS',
    'BETWEEN',
  ],
  select: [
    'EQUALS',
    'NOT_EQUALS',
    'IN',
    'NOT_IN',
  ],
  multiselect: [
    'CONTAINS_ANY',
    'CONTAINS_ALL',
    'IS_EMPTY',
  ],
};

export const FIELD_TYPE_LABELS: Record<ConditionFieldType, string> = {
  number: 'Số (Number)',
  string: 'Văn bản ngắn (String)',
  textarea: 'Đoạn văn bản (Textarea)',
  boolean: 'Đúng / Sai (Boolean)',
  date: 'Ngày tháng (Date)',
  datetime: 'Ngày giờ (Datetime)',
  select: 'Chọn 1 (Select)',
  multiselect: 'Chọn nhiều (Multi-select)',
};

export function getOperatorsForType(fieldType: ConditionFieldType): OperatorMeta[] {
  const ops = FIELD_TYPE_OPERATORS[fieldType] || FIELD_TYPE_OPERATORS.string;
  return ops.map(op => OPERATOR_METAS[op]);
}

export function operatorRequiresValue(op: ConditionOperator): boolean {
  return OPERATOR_METAS[op]?.requiresValue !== false;
}

export function operatorIsRange(op: ConditionOperator): boolean {
  return OPERATOR_METAS[op]?.isRange === true;
}
