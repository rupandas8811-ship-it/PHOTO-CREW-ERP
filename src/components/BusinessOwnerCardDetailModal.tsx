import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, Info } from 'lucide-react';
import { formatINR } from '../utils';

interface ColumnDefinition {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

interface BusinessOwnerCardDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose';
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

  // Search filter inside the modal for ease of review
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => {
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [data, searchTerm]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.minHeight = '';
      document.body.style.position = '';
      document.body.style.padding = '';
      document.body.style.margin = '';
      document.body.style.width = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.minHeight = '';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Determine colors based on accent type
  const colorMap = {
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'from-emerald-950/20 to-zinc-950',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    blue: {
      border: 'border-blue-500/30',
      bg: 'from-blue-950/20 to-zinc-950',
      text: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'from-amber-950/20 to-zinc-950',
      text: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    rose: {
      border: 'border-rose-500/30',
      bg: 'from-rose-950/20 to-zinc-950',
      text: 'text-rose-400',
      badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  };

  const activeColors = colorMap[accentColor] || colorMap.amber;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/85 z-[150] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`bg-zinc-950 border ${activeColors.border} rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 animate-in fade-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-900 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${accentColor === 'emerald' ? 'bg-emerald-500' : accentColor === 'blue' ? 'bg-blue-500' : accentColor === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`} />
              <h2 className="text-base font-black uppercase tracking-wider text-white font-mono">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-sans">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{subtitle}</span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info & Metrics Bar */}
        <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Card Value representation */}
            <div className="px-4 py-2 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">{totalLabel}:</span>
              <span className={`text-sm sm:text-base font-black font-mono ${activeColors.text}`}>
                {totalValue}
              </span>
            </div>

            {/* Record count representation */}
            <div className="px-4 py-2 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">Records Count:</span>
              <span className="text-sm sm:text-base font-black font-mono text-zinc-200">
                {data.length} {data.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
          </div>

          {/* Search inside popup */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 font-mono"
            />
          </div>
        </div>

        {/* Content Table Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {filterDescription && (
            <div className="mb-4 p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl flex items-start gap-2.5 text-xs text-zinc-400">
              <Info className={`w-4 h-4 ${activeColors.text} mt-0.5 flex-shrink-0`} />
              <span>{filterDescription}</span>
            </div>
          )}

          {filteredData.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-zinc-850 rounded-2xl">
              <p className="text-sm text-zinc-400 font-bold">No records found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                There are no matching items for the current active filters or search terms.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block border border-zinc-900 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/80 border-b border-zinc-900 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        {columns.map(col => (
                          <th key={col.key} className="py-3 px-4 font-bold">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 bg-zinc-950/20 text-xs">
                      {filteredData.map((item, idx) => (
                        <tr 
                          key={item.id || item.order_id || item.lead_id || idx} 
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          {columns.map(col => (
                            <td key={col.key} className="py-3 px-4 text-zinc-300 font-sans">
                              {col.render ? col.render(item) : String(item[col.key] || 'N/A')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card-Stack View */}
              <div className="md:hidden space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {filteredData.map((item, idx) => (
                  <div 
                    key={item.id || item.order_id || item.lead_id || idx} 
                    className="bg-zinc-900/30 border border-zinc-850/80 p-4 rounded-xl space-y-2.5 shadow-inner"
                  >
                    {columns.map(col => (
                      <div 
                        key={col.key} 
                        className="flex flex-col gap-1 border-b border-zinc-900/40 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                          {col.label}
                        </span>
                        <div className="text-xs text-zinc-250 font-sans break-words">
                          {col.render ? col.render(item) : String(item[col.key] || 'N/A')}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 font-mono transition-colors cursor-pointer"
          >
            Close Detail View
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
