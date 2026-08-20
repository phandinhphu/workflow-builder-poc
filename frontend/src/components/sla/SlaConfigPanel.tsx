import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

type DurationUnit = 'MINUTES' | 'HOURS' | 'DAYS' | 'BUSINESS_DAYS';

interface SlaConfig {
  enabled: boolean;
  dueDuration: number;
  durationUnit: DurationUnit;
  timezone?: string;
  calendarId?: string;
  reminder?: {
    enabled: boolean;
    beforeDuration: number;
    beforeUnit: DurationUnit;
    messageTemplate: string;
    channels: string[];
  };
  escalation?: {
    enabled: boolean;
    triggerAfter: number;
    triggerUnit: DurationUnit;
    action: 'REASSIGN' | 'ADD_WATCHER' | 'NOTIFY' | 'AUTO_REJECT' | 'AUTO_COMPLETE';
    escalationResolver?: string;
    escalationMessage?: string;
  };
  timeoutAction: 'AUTO_REJECT' | 'AUTO_COMPLETE' | 'ROUTE_TIMEOUT' | 'FAIL';
}

interface SlaConfigPanelProps {
  config: SlaConfig;
  onChange: (config: SlaConfig) => void;
}

const DURATION_UNITS: { label: string; value: DurationUnit }[] = [
  { label: 'Minutes', value: 'MINUTES' },
  { label: 'Hours', value: 'HOURS' },
  { label: 'Days', value: 'DAYS' },
  { label: 'Business Days', value: 'BUSINESS_DAYS' },
];

const TIMEOUT_ACTIONS = [
  { label: 'Auto Reject', value: 'AUTO_REJECT', description: 'Tự động reject khi quá hạn' },
  { label: 'Auto Complete', value: 'AUTO_COMPLETE', description: 'Tự động complete khi quá hạn' },
  { label: 'Route to Timeout Port', value: 'ROUTE_TIMEOUT', description: 'Chuyển sang nhánh timeout' },
  { label: 'Fail', value: 'FAIL', description: 'Đánh dấu task là thất bại' },
];

const ESCALATION_ACTIONS = [
  { label: 'Reassign', value: 'REASSIGN', description: 'Chuyển task cho người khác' },
  { label: 'Add Watcher', value: 'ADD_WATCHER', description: 'Thêm người theo dõi' },
  { label: 'Notify', value: 'NOTIFY', description: 'Gửi thông báo nhắc nhở' },
  { label: 'Auto Reject', value: 'AUTO_REJECT', description: 'Tự động reject' },
  { label: 'Auto Complete', value: 'AUTO_COMPLETE', description: 'Tự động complete' },
];

export function SlaConfigPanel({ config, onChange }: SlaConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (updates: Partial<SlaConfig>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="w-4 h-4" />
          SLA Configuration
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateConfig({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300"
          />
          <span className="text-xs text-gray-500">Enabled</span>
        </label>
      </div>
      {config.enabled && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Due Duration</label>
              <input
                type="number"
                value={config.dueDuration || 0}
                onChange={(e) => updateConfig({ dueDuration: parseInt(e.target.value) || 0 })}
                min={1}
                placeholder="e.g., 24"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Unit</label>
              <select
                value={config.durationUnit}
                onChange={(e) => updateConfig({ durationUnit: e.target.value as DurationUnit })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Timezone (Optional)</label>
            <input
              value={config.timezone || ''}
              onChange={(e) => updateConfig({ timezone: e.target.value })}
              placeholder="e.g., Asia/Ho_Chi_Minh"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Timeout Action</label>
            <select
              value={config.timeoutAction}
              onChange={(e) => updateConfig({ timeoutAction: e.target.value as SlaConfig['timeoutAction'] })}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {TIMEOUT_ACTIONS.map((action) => (
                <option key={action.value} value={action.value}>{action.label} - {action.description}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-gray-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500">Reminder</label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.reminder?.enabled || false}
                      onChange={(e) =>
                        updateConfig({
                          reminder: {
                            enabled: e.target.checked,
                            beforeDuration: config.reminder?.beforeDuration || 1,
                            beforeUnit: config.reminder?.beforeUnit || 'HOURS',
                            messageTemplate: config.reminder?.messageTemplate || '',
                            channels: config.reminder?.channels || ['inapp'],
                          },
                        })
                      }
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-xs text-gray-500">Enable</span>
                  </label>
                </div>
                {config.reminder?.enabled && (
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <input
                      type="number"
                      value={config.reminder?.beforeDuration || 1}
                      onChange={(e) =>
                        updateConfig({
                          reminder: { ...config.reminder!, beforeDuration: parseInt(e.target.value) || 1 },
                        })
                      }
                      min={1}
                      placeholder="Before"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={config.reminder?.beforeUnit || 'HOURS'}
                      onChange={(e) =>
                        updateConfig({
                          reminder: { ...config.reminder!, beforeUnit: e.target.value as DurationUnit },
                        })
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      {DURATION_UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500">Escalation</label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.escalation?.enabled || false}
                      onChange={(e) =>
                        updateConfig({
                          escalation: {
                            enabled: e.target.checked,
                            triggerAfter: config.escalation?.triggerAfter || 48,
                            triggerUnit: config.escalation?.triggerUnit || 'HOURS',
                            action: config.escalation?.action || 'NOTIFY',
                          },
                        })
                      }
                      className="w-3 h-3 rounded"
                    />
                    <span className="text-xs text-gray-500">Enable</span>
                  </label>
                </div>
                {config.escalation?.enabled && (
                  <div className="space-y-2 pl-4">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={config.escalation?.triggerAfter || 48}
                        onChange={(e) =>
                          updateConfig({
                            escalation: { ...config.escalation!, triggerAfter: parseInt(e.target.value) || 48 },
                          })
                        }
                        min={1}
                        placeholder="After"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      />
                      <select
                        value={config.escalation?.triggerUnit || 'HOURS'}
                        onChange={(e) =>
                          updateConfig({
                            escalation: { ...config.escalation!, triggerUnit: e.target.value as DurationUnit },
                          })
                        }
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      >
                        {DURATION_UNITS.map((unit) => (
                          <option key={unit.value} value={unit.value}>{unit.label}</option>
                        ))}
                      </select>
                    </div>
                    <select
                      value={config.escalation?.action || 'NOTIFY'}
                      onChange={(e) =>
                        updateConfig({
                          escalation: { ...config.escalation!, action: e.target.value as any },
                        })
                      }
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                      {ESCALATION_ACTIONS.map((action) => (
                        <option key={action.value} value={action.value}>{action.label} - {action.description}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
