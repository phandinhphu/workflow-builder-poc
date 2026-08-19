import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import ContextExplorer from './ContextExplorer';

interface DynamicValueFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  nodes?: any[];
  trigger?: any;
  variables?: any[];
  participant?: any;
  disabled?: boolean;
}

interface Chip {
  type: 'text' | 'dynamic';
  content: string;
  path?: string;
}

function parseChips(val: string): Chip[] {
  const chips: Chip[] = [];
  const regex = /\$\{([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(val)) !== null) {
    if (match.index > lastIndex) {
      chips.push({ type: 'text', content: val.slice(lastIndex, match.index) });
    }
    chips.push({ type: 'dynamic', content: match[1], path: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < val.length) {
    chips.push({ type: 'text', content: val.slice(lastIndex) });
  }
  return chips.length > 0 ? chips : [{ type: 'text', content: val }];
}

export default function DynamicValueField({
  value,
  onChange,
  placeholder = 'Nhập giá trị hoặc chọn từ context...',
  label,
  nodes = [],
  trigger,
  variables,
  participant,
  disabled = false,
}: DynamicValueFieldProps) {
  const [isContextExplorerOpen, setIsContextExplorerOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const chips = parseChips(value);

  const handleSelectContext = (path: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const token = `\${${path}}`;
    const newValue = value.slice(0, start) + token + value.slice(end);
    onChange(newValue);
    setDisplayValue(newValue);
    setTimeout(() => {
      if (input) {
        input.selectionStart = start + token.length;
        input.selectionEnd = start + token.length;
      }
    }, 0);
  };

  const removeChip = (chipPath: string) => {
    const newValue = value.replace(`\${${chipPath}}`, '');
    onChange(newValue);
    setDisplayValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
    onChange(e.target.value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsContextExplorerOpen(false);
      }
    };
    if (isContextExplorerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isContextExplorerOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-xs font-bold text-navy uppercase mb-1.5">{label}</label>
      )}

      {chips.some(c => c.type === 'dynamic') && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 border border-gray-200 rounded-md mb-1.5 min-h-[38px]">
          {chips.map((chip, idx) => (
            <span
              key={idx}
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                chip.type === 'dynamic'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {chip.type === 'dynamic' && <SparklesIcon className="w-3 h-3" />}
              <span className="truncate max-w-[150px]">{chip.content}</span>
              {chip.type === 'dynamic' && chip.path && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeChip(chip.path!); }}
                  className="text-primary hover:text-primary-dark p-0.5"
                  aria-label={`Xóa tham chiếu ${chip.path}`}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            'w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-colors',
            disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
          )}
        />
        <button
          type="button"
          onClick={() => setIsContextExplorerOpen(!isContextExplorerOpen)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
          aria-label="Chèn dữ liệu động"
          title="Chèn dữ liệu động (fx)"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
      </div>

      {isContextExplorerOpen && (
        <ContextExplorer
          isOpen={true}
          onClose={() => setIsContextExplorerOpen(false)}
          onSelect={handleSelectContext}
          nodes={nodes}
          trigger={trigger}
          variables={variables}
          participant={participant}
        />
      )}
    </div>
  );
}