import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { TrendingUp } from 'lucide-react';

interface DataTransformNodeData {
  label: string;
  assignments?: Array<{
    targetPath: string;
    sourceExpression: string;
    mode: 'SET' | 'MERGE' | 'APPEND';
  }>;
  executionScope?: 'INSTANCE' | 'EACH_PARTICIPANT';
  hasError?: boolean;
  isSelected?: boolean;
}

const DataTransformNode = ({ data, selected }: { data: DataTransformNodeData; selected?: boolean }) => {
  const assignments = data.assignments || [];
  const hasError = data.hasError;

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md border-2 transition-all duration-200 min-w-[200px] ${
        hasError
          ? 'border-red-400 bg-red-50'
          : selected
          ? 'border-green-500 shadow-lg scale-105'
          : 'border-green-200 hover:border-green-400'
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Data Transform</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        {assignments.length > 0 && (
          <div className="mt-2 space-y-1">
            {assignments.map((a: { targetPath: string; sourceExpression: string; mode: string }, i: number) => (
              <div key={i} className="text-xs bg-green-50 rounded px-2 py-1 border border-green-100">
                <span className="font-mono text-green-700">{a.targetPath}</span>
                <span className="text-gray-400 mx-1">←</span>
                <span className="font-mono text-gray-600 truncate inline-block max-w-[120px]">
                  {a.sourceExpression}
                </span>
              </div>
            ))}
          </div>
        )}
        {assignments.length === 0 && (
          <div className="mt-1 text-xs text-gray-400 italic">No transforms configured</div>
        )}
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

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-green-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500" />
    </div>
  );
};

export default memo(DataTransformNode);
