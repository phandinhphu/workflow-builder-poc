import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workflowTemplates, orgUsers, getCurrentUser } from '../data/mockData';

export default function CreateWorkflowModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateFromUrl = searchParams.get('template');
  const [createType, setCreateType] = useState<'blank' | 'template'>('blank');
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState({
    templateId: templateFromUrl || '',
    name: `${currentUser.name} - Phê duyệt nghỉ phép`,
    description: '',
    type: 'Approval',
    module: 'Operations',
    owner: currentUser.id,
    version: '1.0',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    const state = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      module: formData.module,
      owner: formData.owner,
    };
    if (createType === 'template' && formData.templateId) {
      navigate(`/workflows/new/designer?template=${formData.templateId}`, { state });
    } else {
      navigate('/workflows/new/designer', { state });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-navy">Tạo workflow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-navy rounded-full p-1 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-6">
            <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">Thông tin cơ bản</h3>
            
            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="createType" 
                  checked={createType === 'blank'} 
                  onChange={() => setCreateType('blank')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="text-sm font-medium">Tạo từ workflow trống</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="createType" 
                  checked={createType === 'template'} 
                  onChange={() => setCreateType('template')}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                />
                <span className="text-sm font-medium">Template</span>
              </label>
            </div>

            <form id="create-workflow-form" onSubmit={handleCreate} className="space-y-5">
              {createType === 'template' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn Template <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Chọn template...</option>
                    {workflowTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên workflow <span className="text-danger">*</span>
                </label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea 
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Nhập mô tả cho workflow..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại workflow <span className="text-danger">*</span>
                  </label>
                  <select 
                    name="type"
                    required
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option>Approval</option>
                    <option>Review</option>
                    <option>Assignment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module
                  </label>
                  <select 
                    name="module"
                    value={formData.module}
                    onChange={handleChange}
                    className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option>Operations</option>
                    <option>HR</option>
                    <option>Finance</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-2">
                <h3 className="text-base font-semibold text-navy mb-4 border-b border-gray-100 pb-2">Quyền sở hữu & Phiên bản</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Người sở hữu <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        name="owner"
                        required
                        value={formData.owner}
                        onChange={handleChange}
                        className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-10"
                      >
                        {orgUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.displayName}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-[10px] font-bold">NB</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phiên bản
                    </label>
                    <input 
                      type="text" 
                      value="1.0"
                      disabled
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button 
            type="submit" 
            form="create-workflow-form"
            className="px-4 py-2 bg-primary rounded-md text-white text-sm font-medium hover:bg-primary-dark"
          >
            Tạo Workflow
          </button>
        </div>

      </div>
    </div>
  );
}