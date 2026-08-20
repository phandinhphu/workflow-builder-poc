import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ArrowLeftRight } from 'lucide-react';

interface ParallelSplitNodeData {
  label: string;
  branchMode?: 'ALL' | 'CONDITIONAL';
  branchCount?: number;
  branchIds?: string[];
  hasError?: boolean;
}

const ParallelSplitNode = ({ data, selected }: { data: ParallelSplitNodeData; selected?: boolean }) => {
  const branchCount = data.branchCount || 2;
  const hasError = data.hasError;

  return (
    <div
      className={`relative bg-white rounded-lg shadow-md border-2 transition-all duration-200 min-w-[200px] ${
        hasError
          ? 'border-red-400 bg-red-50'
          : selected
          ? 'border-orange-500 shadow-lg scale-105'
          : 'border-orange-200 hover:border-orange-400'
      }`}
    >
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-orange-600 uppercase tracking-wide">Parallel Split</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <div className="text-xs text-gray-500">
            Mode: <span className="font-medium text-gray-700">{data.branchMode || 'ALL'}</span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: branchCount }).map((_, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-200"
              >
                Branch {i + 1}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-orange-500" />
      {Array.from({ length: branchCount }).map((_, i) => {
        const offset = ((i + 1) / (branchCount + 1)) * 100;
        return (
          <Handle
            key={i}
            type="source"
            position={Position.Bottom}
            id={`BRANCH_${i + 1}`}
            style={{ left: `${offset}%` }}
            className="w-3 h-3 !bg-orange-500"
          />
        );
      })}
    </div>
  );
};

export default memo(ParallelSplitNode);
