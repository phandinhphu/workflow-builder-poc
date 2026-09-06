import { CheckCircle2, User, Clock, FileText } from 'lucide-react';

interface SubmissionEntry {
  taskId?: string;
  userId?: string;
  user?: {
    id: string;
    displayName: string;
    employeeCode: string;
    email: string;
    department?: string;
    jobTitle?: string;
  };
  data?: Record<string, unknown>;
  action?: string;
  submittedAt?: string;
}

interface DynamicSubmissionsTableProps {
  submissions?: SubmissionEntry[];
  title?: string;
  description?: string;
}

export default function DynamicSubmissionsTable({ submissions = [], title, description }: DynamicSubmissionsTableProps) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="font-medium">Chưa có dữ liệu phản hồi từ các người tham gia</p>
      </div>
    );
  }

  // Collect all unique field keys across submissions to build dynamic table headers
  const fieldKeys = Array.from(
    new Set(
      submissions.flatMap(sub => (sub.data ? Object.keys(sub.data) : []))
    )
  );

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden space-y-3">
      {(title || description) && (
        <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          {title && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Tổng hợp phản hồi ({submissions.length} người)
            </span>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            Đã nộp đầy đủ
          </span>
        </div>

        <div className="border border-border rounded-lg overflow-x-auto shadow-inner">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-border text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="p-3">Nhân viên</th>
                <th className="p-3">Phòng ban</th>
                {fieldKeys.map(key => (
                  <th key={key} className="p-3">{key}</th>
                ))}
                <th className="p-3 text-right">Thời gian nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub, idx) => {
                const user = sub.user;
                return (
                  <tr key={sub.taskId || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {user?.displayName ? user.displayName.charAt(0) : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">{user?.displayName || sub.userId || 'Ẩn danh'}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{user?.employeeCode || user?.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {user?.department || '-'}
                    </td>
                    {fieldKeys.map(key => {
                      const val = sub.data?.[key];
                      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                      return (
                        <td key={key} className="p-3 text-xs font-medium text-gray-800">
                          {displayVal}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right text-[11px] text-gray-400 whitespace-nowrap">
                      {sub.submittedAt ? (
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
