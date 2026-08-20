import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface TimerNodeData {
  label: string;
  waitType?: 'DURATION' | 'UNTIL_DATETIME' | 'BUSINESS_TIME';
  duration?: number;
  durationUnit?: string;
  untilDateTime?: string;
  timezone?: string;
  maxWait?: number;
  executionScope?: 'INSTANCE' | 'EACH_PARTICIPANT';
  hasError?: boolean;
}

function formatDuration(duration?: number, unit?: string): string {
  if (!duration) return 'Not configured';
  const units: Record<string, string> = {
    MINUTES: 'min',
    HOURS: 'hr',
    DAYS: 'days',
    BUSINESS_DAYS: 'biz days',
  };
  return `${duration} ${units[unit || 'HOURS'] || unit || 'hr'}`;
}

const TimerNode = ({ data, selected }: { data: TimerNodeData; selected?: boolean }) => {
  const hasError = data.hasError;

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md border-2 transition-all duration-200 min-w-[180px] ${
        hasError
          ? 'border-red-400 bg-red-50'
          : selected
          ? 'border-red-500 shadow-lg scale-105'
          : 'border-red-200 hover:border-red-400'
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-red-600 uppercase tracking-wide">Timer / Delay</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        <div className="mt-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Type:</span>
            <span className="font-medium">{data.waitType || 'DURATION'}</span>
          </div>
          {(data.waitType === 'DURATION' || data.waitType === 'BUSINESS_TIME' || !data.waitType) && (
            <div className="flex justify-between">
              <span className="text-gray-500">Duration:</span>
              <span className="font-medium font-mono">{formatDuration(data.duration, data.durationUnit)}</span>
            </div>
          )}
          {data.waitType === 'UNTIL_DATETIME' && data.untilDateTime && (
            <div className="flex justify-between">
              <span className="text-gray-500">Until:</span>
              <span className="font-medium font-mono">{data.untilDateTime}</span>
            </div>
          )}
          {data.timezone && (
            <div className="flex justify-between">
              <span className="text-gray-500">Timezone:</span>
              <span className="font-medium">{data.timezone}</span>
            </div>
          )}
          {data.maxWait && (
            <div className="flex justify-between">
              <span className="text-gray-500">Max Wait:</span>
              <span className="font-medium">{data.maxWait}h</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
            data.executionScope === 'EACH_PARTICIPANT'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {data.executionScope || 'INSTANCE'}
          </span>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-red-500" />
      <Handle type="source" position={Position.Bottom} id="FIRED" className="w-3 h-3 !bg-red-500" />
      <Handle type="source" position={Position.Right} id="ERROR" className="w-3 h-3 !bg-gray-400" />
    </div>
  );
};

export default memo(TimerNode);
