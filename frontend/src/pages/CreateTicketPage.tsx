import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import type { TicketCategoryDetail } from '../types/category';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';

export default function CreateTicketPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<TicketCategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    setErrorMessage(null);

    api.ticketCategories.get(categoryId)
      .then((data) => {
        setCategory(data);
      })
      .catch((err: any) => {
        setErrorMessage(err.message || 'Không thể tải thông tin danh mục');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [categoryId]);

  const handleSubmitTicket = async (formData: Record<string, any>) => {
    if (!categoryId) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const createdTicket = await api.tickets.create({
        categoryId,
        formData,
      });
      navigate(`/tickets/${createdTicket.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Lỗi khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Đang tải biểu mẫu yêu cầu...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">Không tìm thấy danh mục yêu cầu</h2>
        <p className="text-sm text-gray-500">{errorMessage || 'Danh mục có thể đã bị xóa hoặc ngừng kích hoạt.'}</p>
        <button
          onClick={() => navigate('/tickets')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách yêu cầu
        </button>
      </div>
    );
  }

  const iconColor = category.color || '#3b82f6';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Top action bar */}
      <button
        onClick={() => navigate('/tickets')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh mục</span>
      </button>

      {/* Category Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
            style={{ backgroundColor: iconColor }}
          >
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium text-gray-600 bg-gray-100 border border-gray-200">
                {category.code}
              </span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
              {category.description || 'Điền đầy đủ các thông tin dưới đây để khởi tạo phiếu yêu cầu.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Biểu mẫu v{category.formVersionNumber || 1}</span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
          <div>
            <h4 className="font-semibold">Có lỗi xảy ra</h4>
            <p className="text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form Submission Container */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Nội dung yêu cầu</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Các trường có dấu sao đỏ (<span className="text-rose-500">*</span>) là bắt buộc phải nhập.
          </p>
        </div>

        <DynamicFormRenderer
          schema={category.formSchemaSnapshot || { fields: [] }}
          mode="edit"
          onSubmit={handleSubmitTicket}
          submitting={submitting}
          submitButtonText="Gửi yêu cầu ngay"
        />
      </div>
    </div>
  );
}
