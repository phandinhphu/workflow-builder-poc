import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface WaitForEventNodeData {
  label: string;
  eventType?: string;
  correlationKeyPath?: string;
  payloadSchema?: Record<string, unknown>;
  timeout?: number;
  timeoutUnit?: string;
  consumePolicy?: 'FIRST_MATCH';
  hasError?: boolean;
}

const WaitForEventNode = ({ data, selected }: { data: WaitForEventNodeData; selected?: boolean }) => {
  const err = data.hasError;

  return (
    <div className={`relative bg-white rounded-lg shadow-md border-2 transition-all min-w-[200px] ${
      err ? 'border-red-400 bg-red-50' : selected ? 'border-purple-500 shadow-lg scale-105' : 'border-purple-200 hover:border-purple-400'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">Wait for Event</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          {data.eventType && (
            <div className="flex justify-between">
              <span className="text-gray-500">Event:</span>
              <span className="font-medium font-mono">{data.eventType}</span>
            </div>
          )}
          {data.correlationKeyPath && (
            <div className="flex justify-between">
              <span className="text-gray-500">Correlation:</span>
              <span className="font-medium font-mono truncate max-w-[100px]">{data.correlationKeyPath}</span>
            </div>
          )}
          {data.timeout && (
            <div className="flex justify-between">
              <span className="text-gray-500">Timeout:</span>
              <span className="font-medium">{data.timeout}{data.timeoutUnit || 's'}</span>
            </div>
          )}
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Bottom} id="RECEIVED" className="w-3 h-3 !bg-purple-500" />
      <Handle type="source" position={Position.Right} id="TIMEOUT" className="w-3 h-3 !bg-orange-400" />
    </div>
  );
};

export default memo(WaitForEventNode);
