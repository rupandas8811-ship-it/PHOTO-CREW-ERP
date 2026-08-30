import React from 'react';
import { 
  Film, Layers, CheckCircle2, Clock, UserCheck, RefreshCw, Search, Filter, Sparkles, HardDrive, Calendar
} from 'lucide-react';

export interface ProductionHeaderProps {
  stats: {
    totalProjects: number;
    inProgressCount: number;
    editorAssignedCount: number;
    completedCount: number;
    pendingReviewCount: number;
  };
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const ProductionHeader: React.FC<ProductionHeaderProps> = ({
  stats,
  activeSubTab,
  setActiveSubTab,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  onRefresh,
  isRefreshing
}) => {
  return (
    <div className="space-y-4">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <Film className="w-3 h-3" />
              POST-PRODUCTION MANAGEMENT DASHBOARD
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>Production & Editing Studio</span>
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Track video/photo editing deliverables, crew assignments, drive links, and client proof approvals.
          </p>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className={`px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isRefreshing ? 'opacity-50' : ''
            }`}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Total Projects</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats.totalProjects}</div>
          <span className="text-[10px] text-zinc-500 font-mono block">Active & Archived Orders</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">In Progress / Editing</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{stats.inProgressCount}</div>
          <span className="text-[10px] text-zinc-500 font-mono block">Editors currently active</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Client Review / Consent</span>
            <UserCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">{stats.pendingReviewCount}</div>
          <span className="text-[10px] text-zinc-500 font-mono block">Awaiting client sign-off</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-bold">Completed / Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">{stats.completedCount}</div>
          <span className="text-[10px] text-zinc-500 font-mono block">Fully signed off projects</span>
        </div>
      </div>

      {/* Subtab Switcher & Search Bar */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Navigation Subtabs */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full md:w-auto overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'overview' ? 'bg-purple-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📊 Production Projects
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'tasks' ? 'bg-purple-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            🎬 Editor Deliverable Tasks
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('staff_directory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'staff_directory' ? 'bg-purple-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            👥 Production Editors
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('staff_performance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === 'staff_performance' ? 'bg-purple-500 text-black shadow-md' : 'text-zinc-400 hover:text-white'
            }`}
          >
            📈 Workload Analytics
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, order, editor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-mono placeholder-zinc-600"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-mono text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-900 text-white">All Statuses</option>
              <option value="Footage Received" className="bg-zinc-900 text-white">Footage Received</option>
              <option value="Editor Assigned" className="bg-zinc-900 text-white">Editor Assigned</option>
              <option value="Editing Started" className="bg-zinc-900 text-white">Editing Started / In Progress</option>
              <option value="Customer Review" className="bg-zinc-900 text-white">Customer Review</option>
              <option value="Completed" className="bg-zinc-900 text-white">Completed / Closed</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
