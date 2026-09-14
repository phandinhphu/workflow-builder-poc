import { Handle, Position } from '@xyflow/react';
import {
  CheckCircle2,
  Eye,
  UserPlus,
  BellRing,
  Code2,
  Database,
  Globe2,
  MousePointer2,
  Play,
  Sparkles,
  Plus,
} from 'lucide-react';
import clsx from 'clsx';
import { useDesignerStore } from '../../stores/designerStore';

const nodeConfig: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  start: { icon: MousePointer2, bg: 'bg-indigo-500', text: 'text-white' },
  approval: { icon: CheckCircle2, bg: 'bg-blue-500', text: 'text-white' },
  review: { icon: Eye, bg: 'bg-purple-500', text: 'text-white' },
  assignment: { icon: UserPlus, bg: 'bg-orange-500', text: 'text-white' },
  condition: { icon: Sparkles, bg: 'bg-emerald-500', text: 'text-white' },
  notification: { icon: BellRing, bg: 'bg-yellow-500', text: 'text-white' },
  system: { icon: Code2, bg: 'bg-gray-500', text: 'text-white' },
  data: { icon: Database, bg: 'bg-teal-500', text: 'text-white' },
  http: { icon: Globe2, bg: 'bg-cyan-500', text: 'text-white' },
  end: { icon: Play, bg: 'bg-red-500', text: 'text-white' },
};

const nodeTypeLabels: Record<string, string> = {
  start: 'TRIGGER',
  approval: 'PHÊ DUYỆT',
  review: 'KIỂM DUYỆT',
  assignment: 'PHÂN CÔNG',
  condition: 'ĐIỀU KIỆN',
  notification: 'THÔNG BÁO',
  system: 'SYSTEM ACTION',
  data: 'BẢNG DỮ LIỆU',
  http: 'HTTP REQUEST',
  end: 'KẾT THÚC',
};

export default function CustomNode({ data, isConnectable, selected }: any) {
  const config = nodeConfig[data.nodeType] || nodeConfig.system;
  const Icon = config.icon;
  const isApproval = data.nodeType === 'approval';
  const isReview = data.nodeType === 'review';
  const isApprovalOrReview = isApproval || isReview;
  const isCondition = data.nodeType === 'condition';
  const isStart = data.nodeType === 'start';
  const isEnd = data.nodeType === 'end';
  const hasError = data.invalid === true;

  const openNodeLibrary = () => {
    useDesignerStore.getState().setActiveLeftPanel('nodes');
  };

  return (
    <div className="relative group">
      <div
        className={clsx(
          'w-[248px] shadow-sm rounded-lg bg-white flex flex-col min-h-[64px] border transition-colors',
          selected ? 'border-primary ring-1 ring-primary' : hasError ? 'border-danger ring-1 ring-danger/50' : 'border-border hover:border-gray-300'
        )}
      >
        {!isStart && (
          <Handle
            type="target"
            position={Position.Top}
            isConnectable={isConnectable}
            className="w-3 h-3 bg-gray-300 border-2 border-white"
          />
        )}

        <div className="flex items-start gap-3 p-3">
          <div className={clsx('w-8 h-8 rounded shrink-0 flex items-center justify-center', config.bg, config.text)}>
            <Icon size={16} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">
              {nodeTypeLabels[data.nodeType] || data.nodeType}
            </div>
            <div className="text-sm font-bold text-navy truncate leading-tight">{data.label}</div>
            {data.subLabel && <div className="text-xs text-muted mt-1 truncate">{data.subLabel}</div>}
          </div>
        </div>

        {isCondition && (
          <div className="flex border-t border-gray-100 rounded-b-lg overflow-hidden">
            <div className="flex-1 px-3 py-2 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 flex justify-center items-center">
              <span>TRUE</span>
            </div>
            <div className="flex-1 px-3 py-2 bg-red-50/60 text-[11px] font-bold text-red-600 flex justify-center items-center">
              <span>FALSE</span>
            </div>
          </div>
        )}

        {isApprovalOrReview && (
          <div className="flex border-t border-gray-100 rounded-b-lg overflow-hidden">
            <div className="flex-1 px-3 py-2 bg-emerald-50/60 text-[11px] font-bold text-emerald-700 flex justify-center items-center">
              <span>{isApproval ? 'DUYỆT' : 'ĐỒNG Ý'}</span>
            </div>
            <div className="flex-1 px-3 py-2 bg-red-50/60 text-[11px] font-bold text-red-600 flex justify-center items-center">
              <span>TỪ CHỐI</span>
            </div>
          </div>
        )}

        {/* Output handles */}
        {isCondition && !isEnd && (
          <>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              isConnectable={isConnectable}
              className="left-1/4 w-3 h-3 bg-emerald-500 border-2 border-white"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              isConnectable={isConnectable}
              className="left-3/4 w-3 h-3 bg-red-500 border-2 border-white"
            />
          </>
        )}

        {isApprovalOrReview && !isEnd && (
          <>
            <Handle
              type="source"
              position={Position.Bottom}
              id="APPROVED"
              isConnectable={isConnectable}
              className="left-1/4 w-3 h-3 bg-emerald-500 border-2 border-white"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="REJECTED"
              isConnectable={isConnectable}
              className="left-3/4 w-3 h-3 bg-red-500 border-2 border-white"
            />
          </>
        )}

        {!isCondition && !isApprovalOrReview && !isEnd && (
          <Handle
            type="source"
            position={Position.Bottom}
            isConnectable={isConnectable}
            className="left-1/2 w-3 h-3 bg-gray-300 border-2 border-white"
          />
        )}
      </div>

      {!isEnd && (
        <button
          onClick={openNodeLibrary}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-primary-dark transition-opacity border-2 border-white"
          aria-label="Thêm node sau bước này"
          title="Thêm node sau bước này"
        >
          <Plus size={12} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}