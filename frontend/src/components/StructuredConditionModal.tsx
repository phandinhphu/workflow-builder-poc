import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  CodeBracketIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { GitBranch } from 'lucide-react';
import { api } from '../api/client';
import type { FormSummary, FormField } from '../types/form';
import type {
  StructuredConditionConfig,
  StructuredConditionRule,
  ConditionFieldType,
  ConditionOperator,
} from '../types/workflow';
import {
  FIELD_TYPE_LABELS,
  getOperatorsForType,
  operatorRequiresValue,
  operatorIsRange,
} from '../utils/conditionOperators';

interface StructuredConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: StructuredConditionConfig | null;
  onSave: (config: StructuredConditionConfig) => void;
  nodeName?: string;
}

export default function StructuredConditionModal({
  isOpen,
  onClose,
  config,
  onSave,
  nodeName,
}: StructuredConditionModalProps) {
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [rules, setRules] = useState<StructuredConditionRule[]>([]);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Preview with Form (Design Hint) state - strictly local to UI
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [manualFields, setManualFields] = useState<Record<number, boolean>>({});

  // Initialize rules from incoming config
  useEffect(() => {
    if (isOpen) {
      if (config && Array.isArray(config.rules) && config.rules.length > 0) {
        setLogic(config.logic || 'AND');
        setRules(
          config.rules.map((r, i) => ({
            id: r.id || `rule_${i}_${Date.now()}`,
            field: r.field || '',
            fieldType: r.fieldType || 'string',
            operator: r.operator || 'EQUALS',
            value: r.value ?? '',
            secondValue: r.secondValue ?? '',
          }))
        );
      } else {
        setLogic('AND');
        setRules([
          {
            id: `rule_0_${Date.now()}`,
            field: '',
            fieldType: 'string',
            operator: 'EQUALS',
            value: '',
          },
        ]);
      }
      setManualFields({});
    }
  }, [isOpen, config]);

  // Load available forms for design hint
  useEffect(() => {
    if (isOpen && forms.length === 0) {
      setLoadingForms(true);
      api.forms
        .list()
        .then(list => setForms(list))
        .catch(err => console.error('Lỗi nạp danh sách form hint:', err))
        .finally(() => setLoadingForms(false));
    }
  }, [isOpen, forms.length]);

  // Load selected form fields
  useEffect(() => {
    if (!selectedFormId) {
      setFormFields([]);
      return;
    }
    api.forms
      .get(selectedFormId)
      .then(detail => {
        const fields = detail.draftSchema?.fields || [];
        setFormFields(fields);
      })
      .catch(err => {
        console.error('Lỗi nạp schema form hint:', err);
        setFormFields([]);
      });
  }, [selectedFormId]);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: `rule_${prev.length}_${Date.now()}`,
        field: '',
        fieldType: 'string',
        operator: 'EQUALS',
        value: '',
      },
    ]);
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
    setManualFields(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const updateRule = (index: number, patch: Partial<StructuredConditionRule>) => {
    setRules(prev => {
      const next = [...prev];
      const updated = { ...next[index], ...patch };

      // If fieldType changed, check if current operator is still valid
      if (patch.fieldType && patch.fieldType !== next[index].fieldType) {
        const validOps = getOperatorsForType(patch.fieldType).map(o => o.value);
        if (!validOps.includes(updated.operator)) {
          updated.operator = validOps[0] || 'EQUALS';
        }
      }

      next[index] = updated;
      return next;
    });
  };

  // Map Form field type to ConditionFieldType
  const mapFormFieldType = (formType: string): ConditionFieldType => {
    const t = formType.toLowerCase();
    if (t === 'number') return 'number';
    if (t === 'boolean' || t === 'checkbox') return 'boolean';
    if (t === 'date') return 'date';
    if (t === 'datetime') return 'datetime';
    if (t === 'select') return 'select';
    if (t === 'multiselect' || t === 'multi-select') return 'multiselect';
    if (t === 'textarea') return 'textarea';
    return 'string';
  };

  const handleSelectFormField = (index: number, formFieldKey: string) => {
    const foundField = formFields.find(f => f.key === formFieldKey);
    if (foundField) {
      const fieldType = mapFormFieldType(foundField.type);
      const validOps = getOperatorsForType(fieldType).map(o => o.value);
      updateRule(index, {
        field: foundField.key,
        fieldType,
        operator: validOps[0] || 'EQUALS',
        value: '',
        secondValue: '',
      });
    } else {
      updateRule(index, { field: formFieldKey });
    }
  };

  const handleSave = () => {
    const validRules = rules.map(r => {
      const cleanRule: StructuredConditionRule = {
        field: r.field.trim(),
        fieldType: r.fieldType,
        operator: r.operator,
      };
      if (operatorRequiresValue(r.operator)) {
        if (r.fieldType === 'number') {
          const num = Number(r.value);
          cleanRule.value = isNaN(num) ? r.value : num;
        } else {
          cleanRule.value = r.value;
        }

        if (operatorIsRange(r.operator)) {
          if (r.fieldType === 'number') {
            const num2 = Number(r.secondValue);
            cleanRule.secondValue = isNaN(num2) ? r.secondValue : num2;
          } else {
            cleanRule.secondValue = r.secondValue;
          }
        }
      }
      return cleanRule;
    });

    onSave({
      logic,
      rules: validRules,
    });
    onClose();
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-navy/40 backdrop-blur-xs transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gray-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <GitBranch size={20} />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-base font-bold text-navy">
                        Thiết lập điều kiện rẽ nhánh (Condition Rules)
                      </Dialog.Title>
                      <p className="text-xs text-muted">
                        {nodeName ? `Bước: ${nodeName}` : 'Cấu hình AST Rules chuẩn hóa cho bước điều kiện'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-navy hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                  {/* DESIGN HINT: Preview with Form Bar */}
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sky-900 font-semibold text-xs">
                        <SparklesIcon className="w-4 h-4 text-sky-600" />
                        <span>Preview với Form (Design Hint - Gợi ý trường)</span>
                      </div>
                      {selectedFormId && (
                        <button
                          type="button"
                          onClick={() => setSelectedFormId('')}
                          className="text-xs text-sky-700 hover:text-sky-900 font-medium underline"
                        >
                          Xóa Form gợi ý (Manual)
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedFormId}
                        onChange={e => setSelectedFormId(e.target.value)}
                        disabled={loadingForms}
                        className="flex-1 border border-sky-300 rounded-lg px-3 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">-- Không chọn Form (Nhập tên trường tự do) --</option>
                        {forms.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.code}) {f.latestVersion ? `- v${f.latestVersion}` : ''}
                          </option>
                        ))}
                      </select>
                      {formFields.length > 0 && (
                        <span className="text-xs text-sky-800 bg-sky-100 px-2 py-1 rounded-md font-medium shrink-0">
                          {formFields.length} trường
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-sky-700 leading-relaxed flex items-center gap-1">
                      <InformationCircleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Lựa chọn này <strong>không lưu vào Workflow</strong>, chỉ dùng hỗ trợ điền nhanh tên trường và kiểu dữ liệu.
                      </span>
                    </p>
                  </div>

                  {/* Logic Selector (AND / OR) */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy uppercase">Quy tắc kết hợp logic:</span>
                      <div className="inline-flex rounded-lg border border-border p-0.5 bg-gray-100">
                        <button
                          type="button"
                          onClick={() => setLogic('AND')}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            logic === 'AND'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-navy'
                          }`}
                        >
                          AND (Tất cả phải đúng)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogic('OR')}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            logic === 'OR'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-navy'
                          }`}
                        >
                          OR (Một trong các điều kiện đúng)
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowJsonPreview(!showJsonPreview)}
                      className="text-xs text-muted hover:text-navy flex items-center gap-1 font-medium"
                    >
                      <CodeBracketIcon className="w-4 h-4" />
                      {showJsonPreview ? 'Ẩn AST JSON' : 'Xem AST JSON'}
                    </button>
                  </div>

                  {/* Rules List */}
                  <div className="space-y-3">
                    {rules.map((rule, index) => {
                      const operators = getOperatorsForType(rule.fieldType);
                      const needsValue = operatorRequiresValue(rule.operator);
                      const isRange = operatorIsRange(rule.operator);
                      const isManual = manualFields[index] || !selectedFormId || formFields.length === 0;

                      // Find matched form field for select options
                      const matchedFormField = formFields.find(f => f.key === rule.field);

                      return (
                        <div
                          key={rule.id || index}
                          className="p-3.5 border border-border rounded-xl bg-white hover:border-gray-300 transition-colors shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-xs flex items-center justify-center font-bold">
                                {index + 1}
                              </span>
                              <span>Điều kiện {index + 1}</span>
                              {index > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${logic === 'AND' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {logic}
                                </span>
                              )}
                            </span>

                            <div className="flex items-center gap-2">
                              {selectedFormId && formFields.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setManualFields(prev => ({
                                      ...prev,
                                      [index]: !prev[index],
                                    }))
                                  }
                                  className="text-[11px] text-primary hover:underline font-medium"
                                >
                                  {isManual ? 'Gợi ý từ Form' : 'Nhập tự do'}
                                </button>
                              )}
                              {rules.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeRule(index)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Xóa điều kiện này"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2.5 items-start">
                            {/* FIELD INPUT OR SELECT */}
                            <div className="col-span-12 sm:col-span-4">
                              <label className="block text-[11px] font-bold text-navy uppercase mb-1">
                                Tên trường dữ liệu (Field)
                              </label>
                              {!isManual ? (
                                <select
                                  value={rule.field}
                                  onChange={e => handleSelectFormField(index, e.target.value)}
                                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                  <option value="">-- Chọn trường từ Form --</option>
                                  {formFields.map(f => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} ({f.key}) [{f.type}]
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={rule.field}
                                  onChange={e => updateRule(index, { field: e.target.value })}
                                  placeholder="vd: trip_cost, price"
                                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                                />
                              )}
                            </div>

                            {/* FIELD TYPE SELECT (Disabled if bound to form field, unless manual) */}
                            <div className="col-span-6 sm:col-span-3">
                              <label className="block text-[11px] font-bold text-navy uppercase mb-1">
                                Kiểu dữ liệu (Type)
                              </label>
                              <select
                                value={rule.fieldType}
                                onChange={e =>
                                  updateRule(index, {
                                    fieldType: e.target.value as ConditionFieldType,
                                  })
                                }
                                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {Object.entries(FIELD_TYPE_LABELS).map(([t, label]) => (
                                  <option key={t} value={t}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* OPERATOR SELECT */}
                            <div className="col-span-6 sm:col-span-5">
                              <label className="block text-[11px] font-bold text-navy uppercase mb-1">
                                Phép toán (Operator)
                              </label>
                              <select
                                value={rule.operator}
                                onChange={e =>
                                  updateRule(index, {
                                    operator: e.target.value as ConditionOperator,
                                  })
                                }
                                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                              >
                                {operators.map(op => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* VALUE INPUT (DYNAMIC) */}
                            <div className="col-span-12">
                              {!needsValue ? (
                                <div className="p-2 bg-gray-50 border border-border rounded-lg text-xs text-muted italic">
                                  Toán tử này không yêu cầu nhập giá trị so sánh.
                                </div>
                              ) : isRange ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] text-muted mb-0.5">Từ (Min / From)</label>
                                    <input
                                      type={rule.fieldType === 'number' ? 'number' : rule.fieldType === 'date' ? 'date' : 'text'}
                                      value={rule.value ?? ''}
                                      onChange={e => updateRule(index, { value: e.target.value })}
                                      placeholder="Giá trị tối thiểu..."
                                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] text-muted mb-0.5">Đến (Max / To)</label>
                                    <input
                                      type={rule.fieldType === 'number' ? 'number' : rule.fieldType === 'date' ? 'date' : 'text'}
                                      value={rule.secondValue ?? ''}
                                      onChange={e => updateRule(index, { secondValue: e.target.value })}
                                      placeholder="Giá trị tối đa..."
                                      className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                              ) : rule.fieldType === 'select' && matchedFormField?.options && matchedFormField.options.length > 0 ? (
                                <div>
                                  <label className="block text-[10px] text-muted mb-0.5">Giá trị so sánh (Options)</label>
                                  <select
                                    value={String(rule.value ?? '')}
                                    onChange={e => updateRule(index, { value: e.target.value })}
                                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="">-- Chọn giá trị --</option>
                                    {matchedFormField.options.map(opt => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label} ({opt.value})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : rule.fieldType === 'boolean' ? (
                                <div>
                                  <label className="block text-[10px] text-muted mb-0.5">Giá trị boolean</label>
                                  <select
                                    value={String(rule.value ?? 'true')}
                                    onChange={e => updateRule(index, { value: e.target.value === 'true' })}
                                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-white text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                  >
                                    <option value="true">Đúng (true)</option>
                                    <option value="false">Sai (false)</option>
                                  </select>
                                </div>
                              ) : (
                                <div>
                                  <label className="block text-[10px] text-muted mb-0.5">Giá trị so sánh (Value)</label>
                                  <input
                                    type={
                                      rule.fieldType === 'number'
                                        ? 'number'
                                        : rule.fieldType === 'date'
                                        ? 'date'
                                        : rule.fieldType === 'datetime'
                                        ? 'datetime-local'
                                        : 'text'
                                    }
                                    value={rule.value ?? ''}
                                    onChange={e => updateRule(index, { value: e.target.value })}
                                    placeholder={
                                      rule.fieldType === 'number'
                                        ? 'vd: 10000000'
                                        : rule.operator === 'IN' || rule.operator === 'CONTAINS_ANY'
                                        ? 'vd: PLANE, TRAIN (phân cách bằng dấu phẩy)'
                                        : 'Nhập giá trị...'
                                    }
                                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-primary"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Rule Button */}
                  <button
                    type="button"
                    onClick={addRule}
                    className="w-full border border-dashed border-gray-300 hover:border-primary/60 hover:bg-primary/5 rounded-xl py-2.5 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Thêm điều kiện
                  </button>

                  {/* AST JSON Live Preview */}
                  {showJsonPreview && (
                    <div className="p-3 bg-gray-900 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        AST Rules Output JSON:
                      </span>
                      <pre className="text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(
                          {
                            logic,
                            rules: rules.map(r => ({
                              field: r.field || '<chưa có>',
                              fieldType: r.fieldType,
                              operator: r.operator,
                              value: operatorRequiresValue(r.operator) ? r.value : undefined,
                              ...(operatorIsRange(r.operator) ? { secondValue: r.secondValue } : {}),
                            })),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3.5 border-t border-border bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {rules.filter(r => r.field.trim() !== '').length} / {rules.length} điều kiện hợp lệ
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-border rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                    >
                      Áp dụng điều kiện
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
