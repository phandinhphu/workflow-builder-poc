import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface ConditionRule {
  id: string;
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'isNull' | 'isNotNull';
  value: string;
  type: 'literal' | 'binding';
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

// Very basic string to object mapping for mock purposes. 
// A real app would need a parser to go from string expression back to Trình trực quan.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parseExpressionToGroup = (_expr: string): ConditionGroup => {
  // Mock parser
  return {
    id: 'root',
    logicalOperator: 'AND',
    rules: [
      {
        id: Date.now().toString(),
        field: 'trigger.amount',
        operator: '>',
        value: '1000',
        type: 'literal'
      }
    ]
  };
};

const buildExpressionFromGroup = (group: ConditionGroup): string => {
  if (!group.rules || group.rules.length === 0) return '';
  
  const parts = group.rules.map(rule => {
    if ('logicalOperator' in rule) {
      return `(${buildExpressionFromGroup(rule)})`;
    } else {
      const valStr = rule.type === 'binding' ? `\${${rule.value}}` : (isNaN(Number(rule.value)) ? `'${rule.value}'` : rule.value);
      return `\${${rule.field}} ${rule.operator} ${valStr}`;
    }
  });

  return parts.join(` ${group.logicalOperator} `);
};

export default function ConditionBuilderModal({ isOpen, onClose, expression, onSave }: ConditionBuilderModalProps) {
  const [rootGroup, setRootGroup] = useState<ConditionGroup>({ id: 'root', logicalOperator: 'AND', rules: [] });
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [rawExpression, setRawExpression] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (expression && expression.trim() !== '') {
        try {
          // If it starts looking like our builder, try to parse
          setRootGroup(parseExpressionToGroup(expression));
        } catch {
          // Fallback to code mode if it can't be visually parsed
          setMode('code');
        }
      } else {
        setRootGroup({ id: 'root', logicalOperator: 'AND', rules: [] });
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
    const newRule: ConditionRule = {
      id: Date.now().toString(),
      field: 'context.field',
      operator: '==',
      value: '',
      type: 'literal'
    };

    const addRuleToGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === targetGroupId) {
        return { ...group, rules: [...group.rules, newRule] };
      }
      return {
        ...group,
        rules: group.rules.map(r => 'logicalOperator' in r ? addRuleToGroup(r) : r)
      };
    };

    setRootGroup(addRuleToGroup(rootGroup));
  };

  const removeRuleOrGroup = (targetId: string) => {
    if (targetId === 'root') return; // Can't remove root
    
    const removeFromGroup = (group: ConditionGroup): ConditionGroup => {
      return {
        ...group,
        rules: group.rules.filter(r => r.id !== targetId).map(r => 'logicalOperator' in r ? removeFromGroup(r) : r)
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

  const updateGroup = (groupId: string, updates: Partial<ConditionGroup>) => {
    const updateInGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return { ...group, ...updates };
      }
      return {
        ...group,
        rules: group.rules.map(r => 'logicalOperator' in r ? updateInGroup(r) : r)
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
          field: 'context.field',
          operator: '==',
          value: '',
          type: 'literal'
        }
      ]
    };

    const addGroupToGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === targetGroupId) {
        return { ...group, rules: [...group.rules, newGroup] };
      }
      return {
        ...group,
        rules: group.rules.map(r => 'logicalOperator' in r ? addGroupToGroup(r) : r)
      };
    };

    setRootGroup(addGroupToGroup(rootGroup));
  };

  const renderGroup = (group: ConditionGroup, depth: number = 0) => {
    return (
      <div key={group.id} className={`p-4 rounded-md border ${depth === 0 ? 'border-transparent bg-white' : 'border-gray-200 bg-gray-50 mt-2'} relative`}>
        {depth > 0 && (
          <button 
            onClick={() => removeRuleOrGroup(group.id)}
            className="absolute -right-2 -top-2 bg-white rounded-full text-red-400 hover:text-red-600 border border-gray-200 shadow-sm p-1"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
        
        <div className="flex items-center gap-2 mb-3">
          <select 
            value={group.logicalOperator}
            onChange={(e) => updateGroup(group.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
            className="rounded bg-primary/10 border-primary/20 text-primary text-sm font-semibold py-1 px-2 focus:ring-primary/100"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
          <span className="text-sm text-gray-500">Khớp {group.logicalOperator === 'AND' ? 'tất cả' : 'bất kỳ'} các quy tắc sau:</span>
        </div>

        <div className="pl-4 border-l-2 border-primary/10 space-y-2">
          {group.rules.map(ruleOrGroup => {
            if ('logicalOperator' in ruleOrGroup) {
              return renderGroup(ruleOrGroup, depth + 1);
            } else {
              const rule = ruleOrGroup as ConditionRule;
              return (
                <div key={rule.id} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded border border-gray-100 shadow-sm">
                  <div className="flex-1 min-w-[150px]">
                    <input 
                      type="text" 
                      placeholder="vd: trigger.body.amount"
                      value={rule.field}
                      onChange={e => updateRule(rule.id, { field: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/100 focus:ring-primary/100 sm:text-sm px-2 py-1.5 border font-mono text-xs"
                    />
                  </div>
                  <div className="w-32">
                    <select
                      value={rule.operator}
                      onChange={e => updateRule(rule.id, { operator: e.target.value as any })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/100 focus:ring-primary/100 sm:text-sm px-2 py-1.5 border text-xs"
                    >
                      <option value="==">equals (==)</option>
                      <option value="!=">not equals (!=)</option>
                      <option value=">">greater than (&gt;)</option>
                      <option value=">=">greater or eq (&gt;=)</option>
                      <option value="<">less than (&lt;)</option>
                      <option value="<=">less or eq (&lt;=)</option>
                      <option value="contains">contains</option>
                      <option value="in">in list</option>
                      <option value="isNull">is null</option>
                      <option value="isNotNull">is not null</option>
                    </select>
                  </div>
                  {!['isNull', 'isNotNull'].includes(rule.operator) && (
                    <div className="flex-1 min-w-[150px] flex items-center gap-1">
                       <select
                          value={rule.type}
                          onChange={e => updateRule(rule.id, { type: e.target.value as any, value: '' })}
                          className="rounded border-gray-300 bg-gray-50 text-gray-500 sm:text-xs px-1 py-1.5 border"
                          title="Value Type"
                        >
                          <option value="literal">Text/Num</option>
                          <option value="binding">Variable</option>
                        </select>
                      <input 
                        type="text" 
                        placeholder={rule.type === 'binding' ? 'vd: participant.limit' : 'Value'}
                        value={rule.value}
                        onChange={e => updateRule(rule.id, { value: e.target.value })}
                        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary/100 focus:ring-primary/100 sm:text-sm px-2 py-1.5 border ${rule.type === 'binding' ? 'font-mono text-xs bg-primary/10' : ''}`}
                      />
                    </div>
                  )}
                  <button onClick={() => removeRuleOrGroup(rule.id)} className="text-gray-400 hover:text-red-500 p-1">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            }
          })}

          <div className="flex items-center gap-2 pt-2">
            <button 
              onClick={() => addRule(group.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark bg-primary/10 px-2 py-1 rounded"
            >
              <PlusIcon className="w-3 h-3" /> Thêm điều kiện
            </button>
            <button 
              onClick={() => addGroup(group.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800 bg-gray-100 px-2 py-1 rounded"
            >
              <PlusIcon className="w-3 h-3" /> Thêm nhóm con
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
      <Dialog as="div" className="relative z-10" open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6 flex flex-col">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start flex-shrink-0">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                        Trình tạo điều kiện
                      </Dialog.Title>
                      <p className="mt-2 text-sm text-gray-500">
                        Định nghĩa các quy tắc để đánh giá nhánh rẽ của luồng xử lý.
                      </p>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setMode('visual')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${mode === 'visual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Trình trực quan
                      </button>
                      <button 
                        onClick={() => setMode('code')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md ${mode === 'code' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        Biểu thức
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {mode === 'visual' ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50/50">
                      {renderGroup(rootGroup)}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        rows={10}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 font-mono p-4"
                        value={rawExpression}
                        onChange={(e) => setRawExpression(e.target.value)}
                        placeholder="${trigger.amount} > 1000 && ${department} == 'IT'"
                      />
                      <p className="mt-2 text-xs text-gray-500">Dùng biểu thức kiểu JavaScript với biến context.</p>
                    </div>
                  )}

                  {mode === 'visual' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto whitespace-nowrap">
                      <strong>Preview:</strong> {buildExpressionFromGroup(rootGroup) || '(biểu thức trống)'}
                    </div>
                  )}
                </div>

                <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse flex-shrink-0 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/100 sm:ml-3 sm:w-auto"
                    onClick={handleSave}
                  >
                    Lưu điều kiện
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Hủy
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