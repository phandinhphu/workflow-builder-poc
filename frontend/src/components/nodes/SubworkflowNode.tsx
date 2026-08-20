import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';

interface SubworkflowNodeData {
  label: string;
  workflowRef?: string;
  workflowRefName?: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  waitPolicy?: 'WAIT_FOR_COMPLETION' | 'FIRE_AND_FORGET';
  hasError?: boolean;
}

const SubworkflowNode = ({ data, selected }: { data: SubworkflowNodeData; selected?: boolean }) => {
  const err = data.hasError;
  const inputCount = data.inputMapping ? Object.keys(data.inputMapping).length : 0;
  const outputCount = data.outputMapping ? Object.keys(data.outputMapping).length : 0;

  return (
    <div className={`relative bg-white rounded-lg shadow-md border-2 transition-all min-w-[200px] ${
      err ? 'border-red-400 bg-red-50' : selected ? 'border-cyan-500 shadow-lg scale-105' : 'border-cyan-200 hover:border-cyan-400'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Subworkflow</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{data.label}</div>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-xs">
          {data.workflowRefName && (
            <div className="flex justify-between">
              <span className="text-gray-500">Workflow:</span>
              <span className="font-medium truncate max-w-[120px]">{data.workflowRefName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Wait:</span>
            <span className="font-medium">{data.waitPolicy || 'WAIT_FOR_COMPLETION'}</span>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="bg-cyan-50 px-1.5 py-0.5 rounded">{inputCount} inputs</span>
            <span className="bg-cyan-50 px-1.5 py-0.5 rounded">{outputCount} outputs</span>
          </div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-cyan-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-cyan-500" />
    </div>
  );
};

export default memo(SubworkflowNode);
