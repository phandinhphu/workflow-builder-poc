import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ArrowUpTrayIcon, 
  UserPlusIcon, 
  DocumentArrowDownIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { api } from '../../api/client';
import type { OrgUser } from '../../types/workflow';
import clsx from 'clsx';

interface AssignmentTaskModalProps {
  taskId: string;
  taskTitle: string;
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export default function AssignmentTaskModal({ taskId: _taskId, taskTitle, onComplete, onClose }: AssignmentTaskModalProps) {
  const [tab, setTab] = useState<'picker' | 'upload'>('picker');
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  
  // Upload states
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    validUsers: OrgUser[];
    invalidRows: Array<{ rowIndex: number; rawIdentifier: string; reason: string }>;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void api.users.list().then(setUsers).catch(console.error);
  }, []);

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.employeeCode || u.externalId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsUploading(true);
    setUploadError('');
    try {
      const res = await api.runtime.participants.previewImport(selected);
      setPreviewData(res);
      // Auto select valid users from file
      if (res.validUsers && res.validUsers.length > 0) {
        const fileUserIds = res.validUsers.map((u: OrgUser) => u.id);
        setSelectedUserIds(prev => Array.from(new Set([...prev, ...fileUserIds])));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi đọc file Excel/CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(api.runtime.participants.downloadTemplateUrl, '_blank');
  };

  const handleSubmit = async () => {
    if (selectedUserIds.length === 0) {
      alert('Vui lòng chọn hoặc import ít nhất 1 người tham gia');
      return;
    }
    setSubmitting(true);
    try {
      const selectedUsers = users.filter(u => selectedUserIds.includes(u.id));
      await onComplete({
        participantUserIds: selectedUserIds,
        participantIds: selectedUserIds,
        participants: selectedUsers.map(u => ({
          id: u.id,
          employeeCode: u.employeeCode || u.externalId,
          displayName: u.displayName,
          email: u.email,
          department: u.department,
          jobTitle: u.jobTitle || u.role
        })),
        totalCount: selectedUserIds.length
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi hoàn thành task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 via-white to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <UserPlusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Phân bổ người tham gia (Assignment Step)</h2>
              <p className="text-xs text-gray-500 font-medium">Task: {taskTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('picker')}
              className={clsx(
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
                tab === 'picker' 
                  ? "border-purple-600 text-purple-700 bg-white shadow-sm rounded-t-lg" 
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              <UserPlusIcon className="w-4 h-4" />
              Chọn từ danh sách HRM ({selectedUserIds.length})
            </button>
            <button
              onClick={() => setTab('upload')}
              className={clsx(
                "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
                tab === 'upload' 
                  ? "border-purple-600 text-purple-700 bg-white shadow-sm rounded-t-lg" 
                  : "border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              Upload file Excel / CSV
            </button>
          </div>

          <span className="text-xs font-medium px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
            Đã chọn: {selectedUserIds.length} người
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'picker' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, email, mã nhân viên, phòng ban..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setSelectedUserIds([])}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Bỏ chọn tất cả
                </button>
              </div>

              {/* User List Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto shadow-inner bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Mã NV</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phòng ban</th>
                      <th className="p-3">Chức vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          Không tìm thấy nhân viên phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => {
                        const isSelected = selectedUserIds.includes(user.id);
                        return (
                          <tr 
                            key={user.id} 
                            onClick={() => toggleUser(user.id)}
                            className={clsx(
                              "cursor-pointer transition-colors",
                              isSelected ? "bg-purple-50/70 hover:bg-purple-100/70" : "hover:bg-gray-50"
                            )}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                            </td>
                            <td className="p-3 font-mono text-xs font-semibold text-gray-700">{user.employeeCode || user.externalId}</td>
                            <td className="p-3 font-medium text-gray-900">{user.displayName}</td>
                            <td className="p-3 text-gray-500 text-xs">{user.email}</td>
                            <td className="p-3 text-gray-600 text-xs">{user.department || '-'}</td>
                            <td className="p-3 text-gray-500 text-xs">{user.jobTitle || user.role || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dropzone & Template */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2 border-2 border-dashed border-gray-300 hover:border-purple-500 rounded-xl p-6 text-center transition-colors bg-gray-50/50">
                  <ArrowUpTrayIcon className="w-10 h-10 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-900">Kéo thả file Excel (.xlsx, .xls) hoặc CSV vào đây</p>
                  <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tự động đối soát mã nhân viên/email với hệ thống HRM</p>
                  
                  <label className="mt-4 inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-md shadow-purple-200 transition-all">
                    <span>Chọn file từ máy tính</span>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {file && <p className="text-xs font-medium text-purple-700 mt-2">Đã chọn: {file.name}</p>}
                </div>

                <div className="border border-purple-100 bg-purple-50/50 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <DocumentArrowDownIcon className="w-5 h-5 text-purple-600" />
                    File mẫu chuẩn
                  </h4>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    Tải file mẫu định dạng Excel chuẩn có sẵn cột Mã nhân viên, Tên và Ghi chú.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full py-2 bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Tải file mẫu Excel (.xlsx)
                  </button>
                </div>
              </div>

              {isUploading && (
                <div className="p-4 text-center text-sm font-medium text-purple-700 animate-pulse bg-purple-50 rounded-lg">
                  Đang phân tích dữ liệu file và đối soát danh bạ HRM...
                </div>
              )}

              {uploadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Preview Result */}
              {previewData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <p className="text-xs text-gray-500 font-medium">Tổng số dòng</p>
                      <p className="text-lg font-bold text-gray-800">{previewData.totalRows}</p>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                      <p className="text-xs text-green-700 font-medium">Hợp lệ (Đã nạp)</p>
                      <p className="text-lg font-bold text-green-800 flex items-center justify-center gap-1">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        {previewData.validCount}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <p className="text-xs text-amber-700 font-medium">Dòng lỗi / Bỏ qua</p>
                      <p className="text-lg font-bold text-amber-800 flex items-center justify-center gap-1">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
                        {previewData.invalidCount}
                      </p>
                    </div>
                  </div>

                  {previewData.invalidRows.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <h5 className="text-xs font-bold text-amber-900 uppercase">Chi tiết các dòng không hợp lệ:</h5>
                      <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-amber-800">
                        {previewData.invalidRows.map((inv, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="font-mono font-bold">Dòng {inv.rowIndex}:</span>
                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200">{inv.rawIdentifier}</span>
                            <span>- {inv.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Tổng cộng: <strong className="text-purple-700">{selectedUserIds.length}</strong> nhân viên sẽ được gán làm task ở bước tiếp theo.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              disabled={submitting || selectedUserIds.length === 0}
              onClick={handleSubmit}
              className={clsx(
                "px-5 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all flex items-center gap-2",
                submitting || selectedUserIds.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 shadow-purple-200"
              )}
            >
              {submitting ? 'Đang phân bổ...' : `Xác nhận & Phân bổ (${selectedUserIds.length})`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
