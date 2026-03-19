import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  LayoutDashboard,
  ClipboardCheck,
  MessageSquareWarning,
  DollarSign,
  FileText,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: 'Pages' | 'Audits' | 'Complaints' | 'Invoices';
  icon: React.ElementType;
  path: string;
}

const pages: SearchResult[] = [
  { id: 'page-dashboard', title: 'Dashboard', subtitle: 'Operations overview', category: 'Pages', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'page-quality', title: 'Quality Audits', subtitle: 'AI-generated checklists & CAPA', category: 'Pages', icon: ClipboardCheck, path: '/quality' },
  { id: 'page-complaints', title: 'Complaints', subtitle: 'Customer complaint management', category: 'Pages', icon: MessageSquareWarning, path: '/complaints' },
  { id: 'page-finance', title: 'Finance & Export', subtitle: 'Invoice compliance & documentation', category: 'Pages', icon: DollarSign, path: '/finance' },
];

const categoryColors: Record<string, string> = {
  Pages: 'bg-accent-50 text-accent-700 border-accent-200',
  Audits: 'bg-success-50 text-success-700 border-success-200',
  Complaints: 'bg-danger-50 text-danger-600 border-danger-200',
  Invoices: 'bg-info-50 text-info-600 border-info-100',
};

export default function CommandPalette({ isOpen, onClose, navigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const all: SearchResult[] = [...pages];

    // Search audits from cache
    const audits = queryClient.getQueryData<any[]>(['audits']);
    if (audits) {
      audits.forEach((a: any) => {
        all.push({
          id: `audit-${a.id}`,
          title: a.title || 'Untitled Audit',
          subtitle: `${a.type || ''} | ${a.product || ''} | ${a.status || ''}`.replace(/\| *\|/g, '|').replace(/^\| | \|$/g, ''),
          category: 'Audits',
          icon: ClipboardCheck,
          path: '/quality',
        });
      });
    }

    // Search complaints from cache (try both with and without filter key)
    const complaints = queryClient.getQueryData<any[]>(['complaints', { status: '', priority: '' }])
      || queryClient.getQueryData<any[]>(['complaints']);
    if (complaints && Array.isArray(complaints)) {
      complaints.forEach((c: any) => {
        all.push({
          id: `complaint-${c.id}`,
          title: `${c.customer_name || 'Unknown'} - ${c.complaint_ref || ''}`,
          subtitle: `${c.product || ''} | ${c.customer_country || ''} | ${c.priority || ''}`,
          category: 'Complaints',
          icon: AlertTriangle,
          path: '/complaints',
        });
      });
    }

    // Search invoices from cache
    const invoices = queryClient.getQueryData<any[]>(['invoices']);
    if (invoices) {
      invoices.forEach((inv: any) => {
        all.push({
          id: `invoice-${inv.id}`,
          title: `${inv.invoice_number || 'No Number'} - ${inv.customer_name || ''}`,
          subtitle: `${inv.destination_country || ''} | ${inv.total_amount ? `${inv.currency || 'USD'} ${inv.total_amount}` : ''} | ${inv.status || ''}`,
          category: 'Invoices',
          icon: Receipt,
          path: '/finance',
        });
      });
    }

    if (!q) return all.slice(0, 20);
    return all.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query, queryClient]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const items = resultsRef.current.querySelectorAll('[data-result-item]');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback((result: SearchResult) => {
    onClose();
    navigate(result.path);
  }, [onClose, navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette Card */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-surface-200"
        style={{ animation: 'commandPaletteIn 0.15s ease-out' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-200">
          <Search className="w-5 h-5 text-surface-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, audits, complaints, invoices..."
            className="flex-1 text-lg text-surface-800 placeholder:text-surface-400 bg-transparent outline-none focus:ring-0 border-none"
            aria-label="Command palette search"
          />
          <kbd className="hidden sm:inline-flex items-center text-xs text-surface-400 bg-surface-100 border border-surface-200 rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 text-surface-300 mx-auto mb-2" />
              <p className="text-surface-500 text-sm">No results found</p>
              <p className="text-surface-400 text-xs mt-0.5">Try a different search term</p>
            </div>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={result.id}
                  data-result-item
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-100 ${
                    isSelected ? 'bg-accent-50' : 'hover:bg-surface-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-accent-100' : 'bg-surface-100'
                  }`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-600' : 'text-surface-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-surface-800' : 'text-surface-700'}`}>
                      {result.title}
                    </p>
                    <p className="text-xs text-surface-400 truncate">{result.subtitle}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${categoryColors[result.category] || 'bg-surface-100 text-surface-600 border-surface-200'}`}>
                    {result.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-200 px-4 py-2 flex items-center gap-4 text-xs text-surface-400">
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-100 border border-surface-200 rounded px-1 py-0.5 font-mono text-[10px]">&uarr;&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-100 border border-surface-200 rounded px-1 py-0.5 font-mono text-[10px]">&crarr;</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-100 border border-surface-200 rounded px-1 py-0.5 font-mono text-[10px]">esc</kbd>
            Close
          </span>
        </div>
      </div>

      <style>{`
        @keyframes commandPaletteIn {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
