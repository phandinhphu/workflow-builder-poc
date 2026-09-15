import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getNodeFriendlyName } from '../utils/workflowTypeUtils';

export interface ViolatingNodeItem {
  id: string;
  name: string;
  type: string;
}

interface TypeSwitchWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetTypeName: string;
  targetTypeId: string;
  violatingNodes: ViolatingNodeItem[];
}

export default function TypeSwitchWarningModal({
  isOpen,
  onClose,
  onConfirm,
  targetTypeName,
  targetTypeId,
  violatingNodes,
}: TypeSwitchWarningModalProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[95]" open={isOpen} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95"
            >
              <Dialog.Panel className="relative transform bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-amber-200/80">
                {/* Header with warning banner */}
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                      <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-base font-bold text-gray-900">
                        Cảnh báo chuyển đổi loại workflow
                      </Dialog.Title>
                      <p className="text-xs text-amber-700 mt-0.5 font-medium">
                        Phát hiện {violatingNodes.length} node không thuộc loại <strong>{targetTypeName || targetTypeId}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors hover:bg-amber-100/50"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Bạn đang muốn chuyển loại workflow sang <strong>{targetTypeName || targetTypeId}</strong>.
                    Tuy nhiên, trên bản vẽ hiện có các bước (node) không được phép sử dụng trong loại này:
                  </p>

                  {/* List of violating nodes */}
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/70 divide-y divide-gray-100 p-1">
                    {violatingNodes.map((node) => (
                      <div key={node.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-gray-800 block truncate">{node.name || 'Chưa đặt tên'}</span>
                          <span className="text-[11px] text-gray-500 font-mono">ID: {node.id}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-medium text-[11px] shrink-0">
                          {getNodeFriendlyName(node.type)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Safe Notice */}
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 text-blue-900">
                    <p className="text-xs leading-relaxed text-blue-800">
                      🔒 <strong>Nguyên tắc an toàn:</strong> Hệ thống sẽ <strong>KHÔNG</strong> tự động xóa các node trên. Bạn có thể tiếp tục chỉnh sửa nhưng sẽ cần gỡ bỏ hoặc thay thế các node này trước khi <strong>Publish</strong>.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors"
                  >
                    Giữ loại hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
                  >
                    Xác nhận chuyển loại
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
