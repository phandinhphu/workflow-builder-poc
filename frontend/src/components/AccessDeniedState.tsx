import { Link } from 'react-router-dom';
import { ShieldExclamationIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface AccessDeniedStateProps {
  title?: string;
  message?: string;
  reason?: string;
  backUrl?: string;
  backLabel?: string;
}

export default function AccessDeniedState({
  title = '403 - Không có quyền truy cập',
  message = 'Bạn không có quyền truy cập vào quy trình này do chính sách phân quyền theo Module hoặc ACL.',
  reason,
  backUrl = '/workflows',
  backLabel = 'Quay lại danh sách Workflow',
}: AccessDeniedStateProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldExclamationIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-navy mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">{message}</p>
        {reason && (
          <div className="bg-red-50/70 border border-red-100 rounded-lg p-3 text-xs text-red-700 font-mono mb-6 text-left">
            {reason}
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
          >
            <ArrowLeftIcon className="w-4 h-4" /> {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
