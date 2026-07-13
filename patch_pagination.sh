cat << 'INNEREOF' > replacement.txt
import React, { useState, useMemo } from 'react';
import { useRole } from '../../RoleContext';
import { CameraLensStatsCard } from '../../CameraLensStatsCard';
import { Users, Award, Briefcase, Activity, Filter, CheckCircle2, AlertCircle, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Staff } from '../../../types';

export const OwnerStaffPerformanceDetailed: React.FC = () => {
  const { staff, productionStaff, users, leads, assignments, editorAssignments, isDataLoading } = useRole();
  const [error, setError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });

  // 1. Process staff performance metrics
  const staffMetrics = useMemo(() => {
    try {
    // Sales Staff
    const salesStaffMetrics = (users || []).filter(u => u.role === 'Sales Team').map(user => {
       const nameLower = user.name.toLowerCase();
       const fullNameLower = (user.full_name || '').toLowerCase();
       const assignedLeads = (leads || []).filter(l => 
         (l.sales_person && l.sales_person.toLowerCase() === nameLower) || 
         (l.sales_person && l.sales_person.toLowerCase() === fullNameLower) || 
         (l.created_by && l.created_by.toLowerCase() === nameLower) ||
         (l.created_by && l.created_by.toLowerCase() === fullNameLower)
       );
       const totalAssigned = assignedLeads.length;
       const completed = assignedLeads.filter(l => ['Order Confirmed', 'Event Scheduled', 'Event Completed', 'Raw Footage Received', 'Editor Assigned', 'Editing Started', 'In Progress', 'Internal QC Review', 'Sent for Client Review', 'Revision', 'Final Approval', 'Delivered', 'Paid', 'Closed'].includes(l.status)).length;
       const pending = assignedLeads.filter(l => ['Lead Received', 'Quotation Shared', 'Follow-Up', 'Negotiation'].includes(l.status)).length;
       const overdue = 0; 
       const score = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
       
       return {
         staff_id: user.id,
         name: user.full_name || user.name,
         department: 'Sales',
         role: 'Sales Executive',
         mobile: user.mobile || 'N/A',
         email: user.email,
         Staff_Type: 'In-House',
         status: user.active !== false ? 'Active' : 'Inactive',
         totalAssigned,
         completed,
         pending,
         overdue,
         score,
         profile_photo: '',
         lastAssignedDate: assignedLeads.length > 0 ? [...assignedLeads].sort((a,b) => new Date(b.created_date || b.created_at || 0).getTime() - new Date(a.created_date || a.created_at || 0).getTime())[0]?.created_date || 'N/A' : 'N/A'
       };
    });

    // Operations Staff
    const opsStaffMetrics = (staff || []).map(member => {
        const opsTasks = (assignments || []).filter(a => a.staff_id === member.staff_id);
        const totalAssigned = opsTasks.length;
        const completed = opsTasks.filter(a => a.status === 'Completed' || a.status === 'Event Completed').length;
        const pending = opsTasks.filter(a => a.status !== 'Completed' && a.status !== 'Event Completed').length;
        const overdue = 0; 
        const score = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
        
        return {
           ...member,
           department: 'Operations',
           totalAssigned,
           completed,
           pending,
           overdue,
           score,
           Staff_Type: member.staff_type || (member as any).Staff_Type || 'In-House',
           lastAssignedDate: opsTasks.length > 0 ? [...opsTasks].sort((a,b) => new Date(b.assigned_date || 0).getTime() - new Date(a.assigned_date || 0).getTime())[0]?.assigned_date || 'N/A' : 'N/A'
        };
    });

    // Production Staff
    const prodStaffMetrics = (productionStaff || []).map(member => {
        const prodTasks = (editorAssignments || []).filter(a => a.staff_id === member.staff_id);
        const totalAssigned = prodTasks.length;
        const completed = prodTasks.filter(a => a.status === 'Completed').length;
        const pending = prodTasks.filter(a => a.status !== 'Completed').length;
        const overdue = 0;
        const score = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
        
        return {
           ...member,
           department: 'Production',
           totalAssigned,
           completed,
           pending,
           overdue,
           score,
           Staff_Type: member.staff_type || (member as any).Staff_Type || 'In-House',
           lastAssignedDate: prodTasks.length > 0 ? [...prodTasks].sort((a,b) => new Date(b.assigned_date || 0).getTime() - new Date(a.assigned_date || 0).getTime())[0]?.assigned_date || 'N/A' : 'N/A'
        };
    });

      return [...salesStaffMetrics, ...opsStaffMetrics, ...prodStaffMetrics];
    } catch (err: any) {
      console.error("Error calculating staff metrics:", err);
      setTimeout(() => setError(err.message), 0);
      return [];
    }
  }, [users, staff, productionStaff, leads, assignments, editorAssignments]);

  // 2. Filtered & Sorted list
  const filteredAndSortedStaff = useMemo(() => {
    let result = staffMetrics.filter(s => {
      const matchDept = deptFilter === 'All' || s.department === deptFilter;
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });

    result.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Basic string/number sorting
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [staffMetrics, deptFilter, searchQuery, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedStaff.length / itemsPerPage);
  const paginatedStaff = filteredAndSortedStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 3. Summaries
  const totalStaff = staffMetrics.length;
  const activeStaff = staffMetrics.filter(s => s.status === 'Active' || s.status === 'On Duty').length;
  const busyStaff = staffMetrics.filter(s => s.pending > 0).length;
  const availableStaff = activeStaff - busyStaff > 0 ? activeStaff - busyStaff : 0;

  const totalAssigned = staffMetrics.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalCompleted = staffMetrics.reduce((sum, s) => sum + s.completed, 0);
  const totalPending = staffMetrics.reduce((sum, s) => sum + s.pending, 0);
  const totalOverdue = staffMetrics.reduce((sum, s) => sum + s.overdue, 0);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  const SortHeader: React.FC<{ label: string, sortKey: string, align?: 'left' | 'center' | 'right' }> = ({ label, sortKey, align = 'left' }) => (
    <th 
      className={`p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono cursor-pointer hover:text-amber-400 transition-colors text-${align}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <ArrowUpDown className="w-3 h-3 opacity-50" />
      </div>
    </th>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CameraLensStatsCard
          label="Total Staff"
          val={totalStaff}
          theme="blue"
          trendText="All Departments"
          lensLabel="PRIME 35mm"
        />
        <CameraLensStatsCard
          label="Active Staff"
          val={activeStaff}
          theme="emerald"
          trendText="Currently Active"
          lensLabel="PRIME 50mm"
        />
        <CameraLensStatsCard
          label="Busy Staff"
          val={busyStaff}
          theme="amber"
          trendText="With Pending Tasks"
          lensLabel="CINE 85mm"
        />
        <CameraLensStatsCard
          label="Available Staff"
          val={availableStaff}
          theme="purple"
          trendText="Ready for Tasks"
          lensLabel="WIDE 24mm"
        />
        <CameraLensStatsCard
          label="Completed Tasks"
          val={totalCompleted}
          theme="green"
          trendText="Across All Depts"
          lensLabel="MACRO 100mm"
        />
        <CameraLensStatsCard
          label="Pending Tasks"
          val={totalPending}
          theme="orange"
          trendText="To Be Completed"
          lensLabel="TELE 200mm"
        />
        <CameraLensStatsCard
          label="Overdue Tasks"
          val={totalOverdue}
          theme="red"
          trendText="Past Deadline"
          lensLabel="ZOOM 70mm"
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
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-zinc-900/50 border border-zinc-800 focus:border-amber-500/50 text-white text-xs rounded-xl pl-9 pr-4 py-2 outline-none w-48 font-mono transition-all"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
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
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-900/30 border-b border-zinc-850">
                <SortHeader label="Staff Name" sortKey="name" />
                <SortHeader label="Department" sortKey="department" />
                <SortHeader label="Staff Type" sortKey="Staff_Type" />
                <SortHeader label="Mobile Number" sortKey="mobile" />
                <SortHeader label="Total Assigned" sortKey="totalAssigned" align="center" />
                <SortHeader label="Completed" sortKey="completed" align="center" />
                <SortHeader label="Pending" sortKey="pending" align="center" />
                <SortHeader label="Overdue" sortKey="overdue" align="center" />
                <SortHeader label="Current Status" sortKey="status" />
                <SortHeader label="Performance %" sortKey="score" />
                <SortHeader label="Last Assigned" sortKey="lastAssignedDate" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/50">
              {paginatedStaff.map((member) => (
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
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] text-zinc-300 font-mono uppercase tracking-wider">{member.department}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                      member.Staff_Type === 'In-House' || member.Staff_Type === 'In House'
                         ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                         : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {member.Staff_Type || 'In-House'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-zinc-400 font-mono text-[11px]">{member.mobile}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-zinc-300 font-mono font-medium text-[11px]">{member.totalAssigned}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-emerald-400 font-mono font-medium text-[11px]">{member.completed}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-amber-400 font-mono font-medium text-[11px]">{member.pending}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-rose-400 font-mono font-medium text-[11px]">{member.overdue}</span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider font-mono border ${
                      member.status === 'Active' || member.status === 'On Duty' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {member.status === 'Active' || member.status === 'On Duty' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {member.status || 'Inactive'}
                    </span>
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
                    <span className="text-zinc-500 font-mono text-[10px]">
                       {member.lastAssignedDate && member.lastAssignedDate !== 'N/A' 
                          ? new Date(member.lastAssignedDate).toLocaleDateString('en-GB')
                          : 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
              {paginatedStaff.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-zinc-500 font-mono text-xs">
                    No staff members found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-900/60 flex items-center justify-between">
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedStaff.length)} of {filteredAndSortedStaff.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                    currentPage === i + 1
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                      : 'border border-transparent text-zinc-500 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
INNEREOF
cp replacement.txt src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx
