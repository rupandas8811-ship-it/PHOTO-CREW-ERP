import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, Info, ArrowLeft, Table as TableIcon } from 'lucide-react';
import { formatINR } from '../utils';

export interface ColumnDefinition {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

export interface BusinessOwnerCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'pink' | 'cyan' | 'indigo' | 'gold';
  data: any[];
  columns: ColumnDefinition[];
  totalLabel?: string;
  totalValue?: React.ReactNode;
  filterDescription?: string;
}

export const BusinessOwnerCardDetailModal: React.FC<BusinessOwnerCardDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  accentColor = 'amber',
  data,
  columns,
  totalLabel = 'Total Value',
  totalValue,
  filterDescription
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Reset search query when modal opens or dataset changes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen, title]);

  // Search filter inside the modal for ease of review
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return JSON.stringify(val).toLowerCase().includes(lowerSearch);
        }
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchTerm]);

  // Lock scroll on background while modal is mounted
  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Determine colors based on accent type
  const colorMap: Record<string, { border: string; bg: string; text: string; badge: string; dot: string }> = {
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'from-emerald-950/20 to-zinc-950',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-500'
    },
    blue: {
      border: 'border-blue-500/30',
      bg: 'from-blue-950/20 to-zinc-950',
      text: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-500'
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'from-amber-950/20 to-zinc-950',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500'
    },
    gold: {
      border: 'border-amber-500/30',
      bg: 'from-amber-950/20 to-zinc-950',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-500'
    },
    rose: {
      border: 'border-rose-500/30',
      bg: 'from-rose-950/20 to-zinc-950',
      text: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-500'
    },
    purple: {
      border: 'border-purple-500/30',
      bg: 'from-purple-950/20 to-zinc-950',
      text: 'text-purple-400',
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      dot: 'bg-purple-500'
    },
    pink: {
      border: 'border-pink-500/30',
      bg: 'from-pink-950/20 to-zinc-950',
      text: 'text-pink-400',
      badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      dot: 'bg-pink-500'
    },
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'from-cyan-950/20 to-zinc-950',
      text: 'text-cyan-400',
      badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      dot: 'bg-cyan-500'
    },
    indigo: {
      border: 'border-indigo-500/30',
      bg: 'from-indigo-950/20 to-zinc-950',
      text: 'text-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      dot: 'bg-indigo-500'
    }
  };

  const activeColors = (accentColor && colorMap[accentColor]) || colorMap.amber;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-detail-modal-title"
    >
      <div 
        className={`bg-zinc-950 border ${activeColors.border} rounded-2xl w-full max-w-6xl h-[94vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Clear Close / Back Button */}
        <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between gap-3 bg-zinc-950/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onClose}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono shrink-0"
              title="Return to Business Owner Dashboard"
              aria-label="Return to Business Owner Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span className="hidden sm:inline font-bold">Back</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${activeColors.dot} shrink-0`} />
                <h2 
                  id="card-detail-modal-title"
                  className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider text-white font-mono truncate"
                >
                  {title}
                </h2>
              </div>
              {subtitle && (
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 font-sans truncate mt-0.5">
                  <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span className="truncate">{subtitle}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close Modal"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info & Metrics Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-zinc-900/40 border-b border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Card Value representation */}
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-sm">
              <span className="text-[11px] sm:text-xs font-mono text-zinc-400">{totalLabel}:</span>
              <span className={`text-xs sm:text-sm md:text-base font-black font-mono ${activeColors.text}`}>
                {totalValue}
              </span>
            </div>

            {/* Record count representation */}
            <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center gap-2 sm:gap-2.5 shadow-sm">
              <TableIcon className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[11px] sm:text-xs font-mono text-zinc-400">Records:</span>
              <span className="text-xs sm:text-sm md:text-base font-black font-mono text-zinc-200">
                {filteredData.length} {filteredData.length === 1 ? 'Row' : 'Rows'}
              </span>
            </div>
          </div>

          {/* Search inside popup */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 font-mono placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Content Table Container - Responsive Table Format across Mobile & Desktop */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-3">
          {filterDescription && (
            <div className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400">
              <Info className={`w-4 h-4 ${activeColors.text} mt-0.5 shrink-0`} />
              <span>{filterDescription}</span>
            </div>
          )}

          {filteredData.length === 0 ? (
            <div className="py-12 sm:py-16 text-center space-y-2 border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/30">
              <p className="text-sm text-zinc-400 font-bold">No matching records found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto px-4">
                {searchTerm 
                  ? `No records match your search query "${searchTerm}". Try a different filter or clear the search.`
                  : 'There are no active records for this metric in the selected date range.'}
              </p>
            </div>
          ) : (
            /* Responsive Table Container with Horizontal Scrolling */
            <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950 shadow-inner">
              <div className="overflow-x-auto w-full min-w-full">
                <table className="w-full text-left border-collapse min-w-max text-xs">
                  <thead>
                    <tr className="bg-zinc-900/90 border-b border-zinc-850 text-[10px] sm:text-[11px] font-mono text-zinc-400 uppercase tracking-wider sticky top-0 z-10 backdrop-blur">
                      {columns.map(col => (
                        <th key={col.key} className="py-3 px-3 sm:px-4 font-bold whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/80 bg-zinc-950 text-xs">
                    {filteredData.map((item, idx) => (
                      <tr 
                        key={item.id || item.order_id || item.lead_id || item.orderId || idx} 
                        className="hover:bg-zinc-900/60 transition-colors"
                      >
                        {columns.map(col => (
                          <td key={col.key} className="py-3 px-3 sm:px-4 text-zinc-300 font-sans whitespace-nowrap">
                            {col.render ? col.render(item) : String(item[col.key] ?? 'N/A')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Clear Back / Close Action */}
        <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-zinc-500 hidden xs:block truncate">
            Showing {filteredData.length} of {data.length} total entries
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-zinc-800 font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
