import React from 'react';
import { Search, Download, FileText, FileSpreadsheet, File as FilePdf } from 'lucide-react';

export interface FilterState {
  search: string;
  status: string;
  dateRange: string;
  startDate: string;
  endDate: string;
}

interface DashboardFilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  statusOptions: { label: string; value: string }[];
  onDownload: (format: 'csv' | 'xlsx' | 'pdf') => void;
  searchPlaceholder?: string;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  filters,
  setFilters,
  statusOptions,
  onDownload,
  searchPlaceholder = "Search..."
}) => {
  const [showDownloadMenu, setShowDownloadMenu] = React.useState(false);

  const handleDateRangeChange = (val: string) => {
    let start = '';
    let end = '';
    const today = new Date();

    if (val === 'Today') {
      start = today.toISOString().split('T')[0];
      end = start;
    } else if (val === 'This Week') {
      const first = today.getDate() - today.getDay();
      const last = first + 6;
      start = new Date(today.setDate(first)).toISOString().split('T')[0];
      end = new Date(today.setDate(last)).toISOString().split('T')[0];
    } else if (val === 'This Month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    setFilters(prev => ({ ...prev, dateRange: val, startDate: start, endDate: end }));
  };

  return (
    <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between mb-6 z-20 relative">
      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
        
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>

        {/* Status Filter */}
        <select
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="All">All Statuses</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Date Range Dropdown */}
        <select
          className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
          value={filters.dateRange}
          onChange={e => handleDateRangeChange(e.target.value)}
        >
          <option value="All Time">All Time</option>
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="Custom">Custom Range</option>
        </select>

        {/* Custom Dates */}
        {filters.dateRange === 'Custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span className="text-zinc-500 text-sm">to</span>
            <input
              type="date"
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/50"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="relative">
        <button
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg border border-zinc-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download Report
        </button>
        
        {showDownloadMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
            <button
              onClick={() => { setShowDownloadMenu(false); onDownload('xlsx'); }}
              className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Excel (.xlsx)
            </button>
            <button
              onClick={() => { setShowDownloadMenu(false); onDownload('csv'); }}
              className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              CSV (.csv)
            </button>
            <button
              onClick={() => { setShowDownloadMenu(false); onDownload('pdf'); }}
              className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
            >
              <FilePdf className="w-4 h-4 text-rose-400" />
              PDF (.pdf)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
