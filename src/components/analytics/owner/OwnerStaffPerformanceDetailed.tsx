import React, { useState, useMemo } from 'react';
import { useRole } from '../../RoleContext';
import { CameraLensStatsCard } from '../../CameraLensStatsCard';
import { DashboardFilterBar, FilterState } from './DashboardFilterBar';
import { exportReport } from './exportUtils';
import { Users, Award, Briefcase, Activity, Filter, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Staff } from '../../../types';

export const OwnerStaffPerformanceDetailed: React.FC = () => {
  const { staff, assignments, editorAssignments, globalDateRange } = useRole();
  const [deptFilter, setDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process staff performance metrics
  const staffMetrics = useMemo(() => {
    return staff.map(member => {
      let totalAssigned = 0;
      let completed = 0;
      let pending = 0;
      let completedEvents = 0;
      let score = 0;
      
      if (member.department === 'Operations') {
        const opsTasks = assignments.filter(a => a.staff_id === member.staff_id);
        totalAssigned = opsTasks.length;
        completed = opsTasks.filter(a => a.status === 'Completed' || a.status === 'Event Completed').length;
        pending = opsTasks.filter(a => a.status !== 'Completed' && a.status !== 'Event Completed').length;
        completedEvents = completed;
        score = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      } else if (member.department === 'Production') {
        const prodTasks = editorAssignments.filter(a => a.staff_id === member.staff_id);
        totalAssigned = prodTasks.length;
        completed = prodTasks.filter(a => a.status === 'Completed').length;
        pending = prodTasks.filter(a => a.status !== 'Completed').length;
        completedEvents = completed;
        score = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      }

      return {
        ...member,
        totalAssigned,
        completed,
        pending,
        completedEvents,
        score
      };
    });
  }, [staff, assignments, editorAssignments]);

  // 2. Filtered list
  const filteredStaff = useMemo(() => {
    return staffMetrics.filter(s => {
      const matchDept = deptFilter === 'All' || s.department === deptFilter;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [staffMetrics, deptFilter, searchQuery]);

  // 3. Summaries
  const topStaff = useMemo(() => {
    return [...staffMetrics].sort((a, b) => b.score - a.score)[0] || null;
  }, [staffMetrics]);

  const totalAssigned = staffMetrics.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalCompleted = staffMetrics.reduce((sum, s) => sum + s.completed, 0);
  const overallProductivity = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CameraLensStatsCard
          label="Total Staff"
          val={staff.length}
          theme="blue"
          trendText="Active Employees"
          lensLabel="PRIME 35mm"
        />
        <CameraLensStatsCard
          label="Overall Productivity"
          val={overallProductivity}
          theme="green"
          trendText="Avg Completion Rate"
          lensLabel="PRIME 50mm"
        />
        <div className="bg-zinc-950/65 backdrop-blur-xl border border-zinc-900 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-500 overflow-hidden relative min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="w-24 h-24" />
          </div>
          <div>
            <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1 font-mono">Top Performer</h3>
            <p className="text-2xl font-bold text-amber-400 font-sans tracking-tight leading-none mt-2">
              {topStaff?.name || 'N/A'}
            </p>
            <p className="text-xs text-zinc-400 mt-2 font-mono">Score: {topStaff?.score || 0}%</p>
          </div>
        </div>
        <CameraLensStatsCard
          label="Total Completed Work"
          val={totalCompleted}
          theme="indigo"
          trendText="Across All Depts"
          lensLabel="CINE 85mm"
        />
      </div>

      {/* Filters & Table */}
      <div className="bg-zinc-950 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Staff Performance Ledger</h2>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5 uppercase tracking-widest">Cross-Department Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl pl-9 pr-4 py-2 outline-none w-48 font-mono transition-all"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 font-mono transition-all cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Production">Production</option>
              <option value="Sales">Sales</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/30 border-b border-zinc-850">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Staff Member</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Role & Dept</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Assigned</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Completed</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Pending</th><th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Avg Time</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Score</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/50">
              {filteredStaff.map((member) => (
                <tr key={member.staff_id} className="hover:bg-zinc-900/20 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {member.profile_photo ? (
                        <img src={member.profile_photo} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-zinc-800" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-zinc-400 text-sm">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-zinc-200 text-sm">{member.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{member.mobile}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-zinc-300 font-medium">{member.role}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{member.department}</div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-300 font-mono font-medium">{member.totalAssigned}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-emerald-400 font-mono font-medium">{member.completed}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-amber-400 font-mono font-medium">{member.pending}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-400 font-mono font-medium">{member.score > 0 ? "48h" : "N/A"}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden max-w-[80px]">
                        <div 
                          className={`h-full rounded-full ${member.score >= 80 ? 'bg-emerald-500' : member.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                          style={{ width: `${member.score}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 w-8">{member.score}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider font-mono border ${
                      member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {member.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {member.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs">
                    No staff members found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
