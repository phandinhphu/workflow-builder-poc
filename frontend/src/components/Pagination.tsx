import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  label?: string;
}

export default function Pagination({ page, pageSize, total, onChange, label = 'mục' }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="p-4 border-t border-border flex justify-between items-center bg-white">
      <span className="text-sm text-muted">
        Hiển thị {from}–{to} trong tổng số {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <button
          className="p-1 border border-border rounded text-gray-400 hover:text-navy disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={clsx(
              'px-3 py-1 border rounded text-sm font-medium',
              p === page ? 'border-primary bg-primary text-white' : 'border-border text-navy hover:bg-gray-50'
            )}
          >
            {p}
          </button>
        ))}
        <button
          className="p-1 border border-border rounded text-gray-400 hover:text-navy disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}