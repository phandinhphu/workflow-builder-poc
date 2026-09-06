import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  PlusCircle, 
  Clock, 
  Tag, 
  CheckCircle2, 
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../api/client';
import type { WorkflowDefinition } from '../types/workflow';

interface ServiceCatalogProps {
  onNavigateToInstance?: (instanceId: string) => void;
  onNavigateToTasks?: () => void;
}

export default function ServiceCatalog({ onNavigateToInstance, onNavigateToTasks }: ServiceCatalogProps) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    void api.workflows.list().then(list => {
      // Show only published workflows
      setWorkflows(list.filter(w => w.status === 'PUBLISHED'));
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const modules = ['ALL', ...Array.from(new Set(workflows.map(w => w.module || w.type || 'Chung')))];

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesModule = selectedModule === 'ALL' || (w.module || w.type || 'Chung') === selectedModule;
    return matchesSearch && matchesModule;
  });

  const handleLaunch = async (workflow: WorkflowDefinition) => {
    setLaunchingId(workflow.id);
    try {
      const res = await api.runtime.start(workflow.id, {
        requestCode: `REQ-${workflow.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now().toString().slice(-4)}`
      });
      if (res && res.id) {
        if (onNavigateToTasks) {
          onNavigateToTasks();
        } else if (onNavigateToInstance) {
          onNavigateToInstance(res.id);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khởi tạo quy trình');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
      {/* Banner / Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Service Catalog & On-Demand Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cổng Dịch vụ & Quy trình Yêu cầu</h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Lựa chọn các quy trình nghiệp vụ đang hoạt động (On-demand Service) để kích hoạt và gửi yêu cầu ngay lập tức. Mỗi yêu cầu sẽ tự động tạo luồng xử lý riêng biệt.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm quy trình, dịch vụ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {modules.map(mod => (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedModule === mod
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mod === 'ALL' ? 'Tất cả danh mục' : mod}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Published Services */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted animate-pulse">
          Đang tải danh mục quy trình dịch vụ...
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-border">
          <Layers className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-base font-bold text-gray-700">Chưa có quy trình nào khả dụng</p>
          <p className="text-xs text-muted mt-1">Các quy trình đã publish sẽ xuất hiện tại đây để nhân viên kích hoạt.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkflows.map(wf => {
            const isAssignmentBased = wf.nodes?.some(n => n.type === 'ASSIGNMENT');
            return (
              <div
                key={wf.id}
                className="group relative bg-white border border-border hover:border-primary/50 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Tag className="w-3 h-3" />
                      {wf.module || wf.type || 'Chung'}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active v{wf.draftVersion}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-navy group-hover:text-primary transition-colors">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                      {wf.description || 'Quy trình xử lý nghiệp vụ tự động hóa.'}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-4 text-[11px] text-gray-500 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {wf.nodes?.length || 0} bước xử lý
                    </span>
                    {isAssignmentBased && (
                      <span className="flex items-center gap-1 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Hỗ trợ Excel Import
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-5 mt-3 border-t border-gray-100">
                  <button
                    disabled={launchingId === wf.id}
                    onClick={() => handleLaunch(wf)}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all group-hover:shadow-md"
                  >
                    {launchingId === wf.id ? (
                      <span>Đang khởi tạo...</span>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Tạo yêu cầu ngay</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
