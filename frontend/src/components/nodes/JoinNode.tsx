import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { ArrowRightLeft } from 'lucide-react';

interface JoinNodeData {
  label: string;
  joinPolicy?: 'ALL' | 'ANY' | 'THRESHOLD';
  expectedBranches?: number;
  threshold?: number;
  cancelRemaining?: boolean;
  hasError?: boolean;
}

const JoinNode = ({ data, selected }: { data: JoinNodeData; selected?: boolean }) => {
  const branches = data.expectedBranches || 2;
  const err = data.hasError;

  return (
    <div className={`relative bg-white rounded-lg shadow-md border-2 transition-all min-w-[200px] ${
      err ? 'border-red-400 bg-red-50' : selected ? 'border-emerald-500 shadow-lg scale-105' : 'border-emerald-200 hover:border-emerald-400'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Join</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Policy:</span>
            <span className="font-medium">{data.joinPolicy || 'ALL'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Expected:</span>
            <span className="font-medium">{branches} branches</span>
          </div>
          {data.joinPolicy === 'THRESHOLD' && (
            <div className="flex justify-between">
              <span className="text-gray-500">Threshold:</span>
              <span className="font-medium">{data.threshold}/{branches}</span>
            </div>
          )}
        </div>
      </div>
      {Array.from({ length: branches }).map((_, i) => (
        <Handle key={i} type="target" position={Position.Top} id={`IN_${i+1}`}
          style={{ left: `${((i+1)/(branches+1))*100}%` }}
          className="w-3 h-3 !bg-emerald-500" />
      ))}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-emerald-500" />
    </div>
  );
};

export default memo(JoinNode);
