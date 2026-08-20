import React, { useState } from 'react';

type CompletionPolicy = 'ALL' | 'ANY' | 'THRESHOLD' | 'PER_PARTICIPANT';

interface CompletionPolicyConfigProps {
  policy: CompletionPolicy;
  threshold?: number;
  thresholdUnit?: 'COUNT' | 'PERCENTAGE';
  onPolicyChange: (policy: CompletionPolicy, threshold?: number, thresholdUnit?: 'COUNT' | 'PERCENTAGE') => void;
  executionScope: 'INSTANCE' | 'EACH_PARTICIPANT';
  showThreshold?: boolean;
}

const POLICY_OPTIONS = [
  { value: 'ALL', label: 'ALL', desc: 'Tất cả assignees phải hoàn thành' },
  { value: 'ANY', label: 'ANY', desc: 'Bất kỳ assignee nào hoàn thành là được' },
  { value: 'THRESHOLD', label: 'THRESHOLD', desc: 'Đủ số lượng/percentage thì hoàn thành' },
  { value: 'PER_PARTICIPANT', label: 'PER_PARTICIPANT', desc: 'Mỗi participant hoàn thành độc lập' },
] as const;

export const CompletionPolicyConfig: React.FC<CompletionPolicyConfigProps> = ({
  policy,
  threshold = 0,
  thresholdUnit = 'COUNT',
  onPolicyChange,
  executionScope,
}) => {
  const [showThresholdUI, setShowThresholdUI] = useState(policy === 'THRESHOLD');

  const handlePolicyChange = (newPolicy: CompletionPolicy) => {
    const isThreshold = newPolicy === 'THRESHOLD';
    setShowThresholdUI(isThreshold);
    onPolicyChange(newPolicy, isThreshold ? threshold : undefined, isThreshold ? thresholdUnit : undefined);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">Completion Policy</h4>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Khi nào node được coi là hoàn thành?</label>
        <select
          value={policy}
          onChange={(e) => handlePolicyChange(e.target.value as CompletionPolicy)}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          {POLICY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.desc}
            </option>
          ))}
        </select>
      </div>

      {showThresholdUI && (
        <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-2">
          <p className="text-xs text-gray-500">Ngưỡng hoàn thành:</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={threshold || 0}
              onChange={(e) => onPolicyChange('THRESHOLD', parseInt(e.target.value) || 0, thresholdUnit)}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              min={1}
              max={thresholdUnit === 'PERCENTAGE' ? 100 : 9999}
            />
            <select
              value={thresholdUnit}
              onChange={(e) => onPolicyChange('THRESHOLD', threshold, e.target.value as 'COUNT' | 'PERCENTAGE')}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="COUNT">tasks</option>
              <option value="PERCENTAGE">%</option>
            </select>
          </div>
        </div>
      )}

      {executionScope === 'EACH_PARTICIPANT' && (
        <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
          Node chạy theo từng participant, mỗi participant có task riêng.
        </div>
      )}
    </div>
  );
};
