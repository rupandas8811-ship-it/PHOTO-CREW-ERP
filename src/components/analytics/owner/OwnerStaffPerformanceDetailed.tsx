import React, { useState, useMemo } from 'react';
import { useRole } from '../../RoleContext';
import { CameraLensStatsCard } from '../../CameraLensStatsCard';
import { Users, Award, Briefcase, Activity, Filter, CheckCircle2, AlertCircle, Search, ChevronLeft, ChevronRight, ArrowUpDown, Calendar, X } from 'lucide-react';
import { Staff } from '../../../types';

export const OwnerStaffPerformanceDetailed: React.FC = () => {
  const { staff, productionStaff, users, leads, orders, production, assignments, editorAssignments, isDataLoading } = useRole();
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [deptFilter, setDeptFilter] = useState('All');
  const [staffTypeFilter, setStaffTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'score', direction: 'desc' });

  // Popup state
  const [selectedTasks, setSelectedTasks] = useState<any[] | null>(null);
  const [popupTitle, setPopupTitle] = useState('');
  
  // Details popup state
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any | null>(null);

  // 1. Process staff performance metrics
  const staffMetrics = useMemo(() => {
    try {
      const isWithinDateRange = (dateStr: string) => {
        if (!dateStr || dateStr === 'N/A') return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return true;
        
        if (startDate) {
          const sd = new Date(startDate);
          if (d < sd) return false;
        }
        if (endDate) {
          const ed = new Date(endDate);
          ed.setHours(23, 59, 59, 999);
          if (d > ed) return false;
        }
        return true;
      };

      const getTaskStatus = (orderId: string, department: string) => {
         const order = (orders || []).find(o => o.order_id === orderId);
         const lead = (leads || []).find(l => l.lead_id === orderId || l.lead_id === order?.lead_id);
         const prod = (production || []).find(p => p.production_id === orderId || p.tracking_id === orderId);

         const customerName = order?.customer_name || lead?.customer_name || 'N/A';
         
         let rawEvents: any[] = [];
         if (lead && lead.events && lead.events.length > 0) {
             rawEvents = lead.events;
         } else if (order?.event_type) {
             rawEvents = [{ event_name: order.event_type }];
         }
         const eventNames = rawEvents.map((e: any) => e.event_name || e.event_type).join(', ') || 'N/A';

         let currentStatus = order?.order_status || order?.current_stage || lead?.status || 'Unknown';
         if (department === 'Production' && prod?.editing_status) {
             currentStatus = prod.editing_status;
         }
         
         const targetDate = prod?.target_delivery_date || order?.delivery_target_date || lead?.delivery_target_date || 'N/A';
         
         let statusClassification = 'Pending';
         const s = currentStatus.toLowerCase();
         
         if (s.includes('delivered') || s.includes('closed') || s.includes('paid')) {
            statusClassification = 'Delivered';
         } else if (s.includes('completed') || s.includes('final approval') || s.includes('event completed')) {
            statusClassification = 'Completed';
         } else if (s.includes('progress') || s.includes('started') || s.includes('review') || s.includes('scheduled') || s.includes('confirmed') || s.includes('revision') || s.includes('raw footage received')) {
            if (s === 'raw footage received' && department === 'Production') {
               statusClassification = 'Pending';
            } else {
               statusClassification = 'In Progress';
            }
         } else if (s.includes('assigned')) {
            statusClassification = 'Pending';
         } else if (s.includes('received') || s.includes('shared') || s.includes('follow-up') || s.includes('negotiation')) {
            statusClassification = 'Pending';
         }

         if (targetDate && targetDate !== 'N/A' && statusClassification !== 'Completed' && statusClassification !== 'Delivered') {
             const tDate = new Date(targetDate);
             if (!isNaN(tDate.getTime()) && tDate < new Date()) {
                 statusClassification = 'Overdue';
             }
         }

         let detailedAssignments: any[] = [];
         let assigned_staff_count = 0;
         if (department === 'Sales') {
             assigned_staff_count = 1;
         } else if (department === 'Operations') {
             detailedAssignments = (assignments || []).filter(a => a.order_id === orderId);
             assigned_staff_count = new Set(detailedAssignments.map(a => a.staff_id)).size;
         } else if (department === 'Production') {
             detailedAssignments = (editorAssignments || []).filter(a => a.production_id === orderId);
             assigned_staff_count = new Set(detailedAssignments.map(a => a.staff_id)).size;
         }

         const eventGroups = rawEvents.map(ev => {
             const evName = ev.event_name || ev.event_type || 'Unknown Event';
             const teamIncludedStr = (ev.team_members_included || '').toString();
             
             let evAssignments = detailedAssignments.filter(a => {
                 if (department === 'Production' && a.event_name) return a.event_name === evName;
                 if (department === 'Operations' && a.event_name) return a.event_name === evName;
                 return false;
             });

             if (rawEvents.length === 1 && evAssignments.length === 0) {
                 evAssignments = detailedAssignments;
             }

             return {
                 eventName: evName,
                 teamIncluded: teamIncludedStr || 'None Specified',
                 assignments: evAssignments.map(a => ({
                     staffName: a.staff_name || a.assigned_to || 'N/A',
                     staffType: a.staff_type || 'N/A',
                     role: a.staff_role || a.role || 'N/A',
                     deliverable: a.speciality || a.deliverable || 'N/A',
                     status: a.status || 'N/A'
                 }))
             };
         });

         if (department === 'Sales' && eventGroups.length === 0) {
             eventGroups.push({
                 eventName: 'Lead Processing',
                 teamIncluded: 'Sales Rep',
                 assignments: [{
                     staffName: 'Sales Staff',
                     staffType: 'In-House',
                     role: 'Sales',
                     deliverable: 'Conversion',
                     status: currentStatus
                 }]
             });
         }

         return {
             orderId,
             customerName,
             eventNames,
             currentStatus,
             targetDate,
             statusClassification,
             assigned_staff_count,
             eventGroups
         };
      };

      const salesStaffMetrics = (users || []).filter(u => u.role === 'Sales Team').map(user => {
         const nameLower = user.name.toLowerCase();
         const fullNameLower = (user.full_name || '').toLowerCase();
         const assignedLeads = (leads || []).filter(l => 
           (l.sales_person && l.sales_person.toLowerCase() === nameLower) || 
           (l.sales_person && l.sales_person.toLowerCase() === fullNameLower) || 
           (l.created_by && l.created_by.toLowerCase() === nameLower) ||
           (l.created_by && l.created_by.toLowerCase() === fullNameLower)
         );
         
         const uniqueTasks = new Map();
         assignedLeads.forEach(l => {
             const id = l.lead_id;
             if (!uniqueTasks.has(id)) {
                 uniqueTasks.set(id, getTaskStatus(id, 'Sales'));
             }
         });

         let pending = 0, inProgress = 0, completed = 0, delivered = 0, overdue = 0;
         const tasksList = Array.from(uniqueTasks.values());
         tasksList.forEach(t => {
             if (t.statusClassification === 'Pending') pending++;
             if (t.statusClassification === 'In Progress') inProgress++;
             if (t.statusClassification === 'Completed') completed++;
             if (t.statusClassification === 'Delivered') delivered++;
             if (t.statusClassification === 'Overdue') overdue++;
         });

         const totalAssigned = uniqueTasks.size;
         const score = totalAssigned > 0 ? Math.round(((completed + delivered) / totalAssigned) * 100) : 0;
         
         const lastDate = assignedLeads.length > 0 ? [...assignedLeads].sort((a,b) => new Date(b.created_date || b.created_at || 0).getTime() - new Date(a.created_date || a.created_at || 0).getTime())[0]?.created_date || 'N/A' : 'N/A';
         
         return {
           staff_id: user.id,
           name: user.full_name || user.name,
           department: 'Sales',
           role: 'Sales Executive',
           mobile: user.mobile || 'N/A',
           email: user.email,
           Staff_Type: 'In House',
           status: user.active !== false ? 'Active' : 'Inactive',
           totalAssigned,
           pending,
           inProgress,
           completed,
           delivered,
           overdue,
           score,
           tasksList,
           profile_photo: '',
           lastAssignedDate: lastDate
         };
      }).filter(s => isWithinDateRange(s.lastAssignedDate));

      const opsStaffMetrics = (staff || []).map(member => {
          const opsTasks = (assignments || []).filter(a => a.staff_id === member.staff_id);
          const uniqueTasks = new Map();
          opsTasks.forEach(a => {
              if (a.order_id && !uniqueTasks.has(a.order_id)) {
                  uniqueTasks.set(a.order_id, getTaskStatus(a.order_id, 'Operations'));
              }
          });

          let pending = 0, inProgress = 0, completed = 0, delivered = 0, overdue = 0;
          const tasksList = Array.from(uniqueTasks.values());
          tasksList.forEach(t => {
             if (t.statusClassification === 'Pending') pending++;
             if (t.statusClassification === 'In Progress') inProgress++;
             if (t.statusClassification === 'Completed') completed++;
             if (t.statusClassification === 'Delivered') delivered++;
             if (t.statusClassification === 'Overdue') overdue++;
          });

          const totalAssigned = uniqueTasks.size;
          const score = totalAssigned > 0 ? Math.round(((completed + delivered) / totalAssigned) * 100) : 0;
          
          const sType = member.staff_type || (member as any).Staff_Type || 'In House';
          const finalSType = sType.replace('-', ' ');

          const lastDate = opsTasks.length > 0 ? [...opsTasks].sort((a,b) => new Date(b.assigned_date || 0).getTime() - new Date(a.assigned_date || 0).getTime())[0]?.assigned_date || 'N/A' : 'N/A';

          return {
             ...member,
             department: 'Operations',
             totalAssigned,
             pending,
             inProgress,
             completed,
             delivered,
             overdue,
             score,
             tasksList,
             Staff_Type: finalSType,
             lastAssignedDate: lastDate
          };
      }).filter(s => isWithinDateRange(s.lastAssignedDate));

      const prodStaffMetrics = (productionStaff || []).map(member => {
          const prodTasks = (editorAssignments || []).filter(a => a.staff_id === member.staff_id);
          const uniqueTasks = new Map();
          prodTasks.forEach(a => {
              if (a.production_id && !uniqueTasks.has(a.production_id)) {
                  uniqueTasks.set(a.production_id, getTaskStatus(a.production_id, 'Production'));
              }
          });

          let pending = 0, inProgress = 0, completed = 0, delivered = 0, overdue = 0;
          const tasksList = Array.from(uniqueTasks.values());
          tasksList.forEach(t => {
             if (t.statusClassification === 'Pending') pending++;
             if (t.statusClassification === 'In Progress') inProgress++;
             if (t.statusClassification === 'Completed') completed++;
             if (t.statusClassification === 'Delivered') delivered++;
             if (t.statusClassification === 'Overdue') overdue++;
          });

          const totalAssigned = uniqueTasks.size;
          const score = totalAssigned > 0 ? Math.round(((completed + delivered) / totalAssigned) * 100) : 0;
          
          const sType = member.staff_type || (member as any).Staff_Type || 'In House';
          const finalSType = sType.replace('-', ' ');

          const lastDate = prodTasks.length > 0 ? [...prodTasks].sort((a,b) => new Date(b.assigned_date || 0).getTime() - new Date(a.assigned_date || 0).getTime())[0]?.assigned_date || 'N/A' : 'N/A';

          return {
             ...member,
             department: 'Production',
             totalAssigned,
             pending,
             inProgress,
             completed,
             delivered,
             overdue,
             score,
             tasksList,
             Staff_Type: finalSType,
             lastAssignedDate: lastDate
          };
      }).filter(s => isWithinDateRange(s.lastAssignedDate));

      return [...salesStaffMetrics, ...opsStaffMetrics, ...prodStaffMetrics];
    } catch (err: any) {
      console.error("Error calculating staff metrics:", err);
      setTimeout(() => setError(err.message), 0);
      return [];
    }
  }, [users, staff, productionStaff, leads, orders, production, assignments, editorAssignments, startDate, endDate]);

  const filteredAndSortedStaff = useMemo(() => {
    let result = staffMetrics.filter(s => {
      const matchDept = deptFilter === 'All' || s.department === deptFilter;
      const matchType = staffTypeFilter === 'All' || s.Staff_Type.toLowerCase() === staffTypeFilter.toLowerCase().replace('-', ' ');
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchType && matchSearch;
    });

    result.sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [staffMetrics, deptFilter, staffTypeFilter, searchQuery, sortConfig]);

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

  const handleStatClick = (tasks: any[], title: string) => {
      if (tasks && tasks.length > 0) {
          setSelectedTasks(tasks);
          setPopupTitle(title);
      }
  };

  const totalStaff = staffMetrics.length;
  const activeStaff = staffMetrics.filter(s => s.status === 'Active' || s.status === 'On Duty').length;
  const busyStaff = staffMetrics.filter(s => s.pending > 0 || s.inProgress > 0).length;
  const availableStaff = activeStaff - busyStaff > 0 ? activeStaff - busyStaff : 0;

  const totalAssigned = staffMetrics.reduce((sum, s) => sum + s.totalAssigned, 0);
  const totalPending = staffMetrics.reduce((sum, s) => sum + s.pending, 0);
  const totalInProgress = staffMetrics.reduce((sum, s) => sum + s.inProgress, 0);
  const totalCompleted = staffMetrics.reduce((sum, s) => sum + s.completed, 0);
  const totalDelivered = staffMetrics.reduce((sum, s) => sum + s.delivered, 0);
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList), 'Total Assigned Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="Total Assigned"
            val={totalAssigned}
            theme="blue"
            trendText="All Tasks"
            lensLabel="PRIME 35mm"
            />
        </div>
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList.filter(t => t.statusClassification === 'Pending')), 'Pending Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="Pending"
            val={totalPending}
            theme="amber"
            trendText="To Be Started"
            lensLabel="CINE 50mm"
            />
        </div>
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList.filter(t => t.statusClassification === 'In Progress')), 'In Progress Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="In Progress"
            val={totalInProgress}
            theme="purple"
            trendText="Currently Active"
            lensLabel="WIDE 24mm"
            />
        </div>
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList.filter(t => t.statusClassification === 'Completed')), 'Completed Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="Completed"
            val={totalCompleted}
            theme="emerald"
            trendText="Finished Work"
            lensLabel="MACRO 100mm"
            />
        </div>
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList.filter(t => t.statusClassification === 'Delivered')), 'Delivered Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="Delivered"
            val={totalDelivered}
            theme="indigo"
            trendText="Sent to Client"
            lensLabel="TELE 200mm"
            />
        </div>
        <div onClick={() => handleStatClick(staffMetrics.flatMap(s => s.tasksList.filter(t => t.statusClassification === 'Overdue')), 'Overdue Tasks')} className="cursor-pointer transition-transform hover:scale-[1.02]">
            <CameraLensStatsCard
            label="Overdue"
            val={totalOverdue}
            theme="red"
            trendText="Past Deadline"
            lensLabel="ZOOM 70mm"
            />
        </div>
      </div>

      <div className="bg-zinc-950 rounded-2xl border border-zinc-850 overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 border-b border-zinc-900/60 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">Staff Performance Ledger</h2>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5 uppercase tracking-widest">Cross-Department Analytics</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-1.5">
               <Calendar className="w-4 h-4 text-zinc-500" />
               <input 
                 type="date"
                 value={startDate}
                 onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                 className="bg-transparent text-zinc-300 text-xs outline-none font-mono"
                 title="Start Date"
               />
               <span className="text-zinc-600">-</span>
               <input 
                 type="date"
                 value={endDate}
                 onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                 className="bg-transparent text-zinc-300 text-xs outline-none font-mono"
                 title="End Date"
               />
            </div>

            <select
              value={staffTypeFilter}
              onChange={(e) => {
                setStaffTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500/50 font-mono transition-all cursor-pointer"
            >
              <option value="All">All Staff Types</option>
              <option value="In House">In House</option>
              <option value="Freelancer">Freelancer</option>
            </select>

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
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-zinc-900/30 border-b border-zinc-850">
                <SortHeader label="Staff Name" sortKey="name" />
                <SortHeader label="Department" sortKey="department" />
                <SortHeader label="Staff Type" sortKey="Staff_Type" />
                <SortHeader label="Mobile Number" sortKey="mobile" />
                <SortHeader label="Total Assigned" sortKey="totalAssigned" align="center" />
                <SortHeader label="Pending" sortKey="pending" align="center" />
                <SortHeader label="In Progress" sortKey="inProgress" align="center" />
                <SortHeader label="Completed" sortKey="completed" align="center" />
                <SortHeader label="Delivered" sortKey="delivered" align="center" />
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
                      member.Staff_Type === 'In House'
                         ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                         : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {member.Staff_Type || 'In House'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-zinc-400 font-mono text-[11px]">{member.mobile}</span>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList, `Tasks Assigned to ${member.name}`)} className="text-blue-400 font-mono font-medium text-[11px] hover:underline hover:text-blue-300">{member.totalAssigned}</button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList.filter(t => t.statusClassification === 'Pending'), `Pending Tasks for ${member.name}`)} className="text-amber-400 font-mono font-medium text-[11px] hover:underline hover:text-amber-300">{member.pending}</button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList.filter(t => t.statusClassification === 'In Progress'), `In Progress Tasks for ${member.name}`)} className="text-purple-400 font-mono font-medium text-[11px] hover:underline hover:text-purple-300">{member.inProgress}</button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList.filter(t => t.statusClassification === 'Completed'), `Completed Tasks for ${member.name}`)} className="text-emerald-400 font-mono font-medium text-[11px] hover:underline hover:text-emerald-300">{member.completed}</button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList.filter(t => t.statusClassification === 'Delivered'), `Delivered Tasks for ${member.name}`)} className="text-indigo-400 font-mono font-medium text-[11px] hover:underline hover:text-indigo-300">{member.delivered}</button>
                  </td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleStatClick(member.tasksList.filter(t => t.statusClassification === 'Overdue'), `Overdue Tasks for ${member.name}`)} className="text-rose-400 font-mono font-medium text-[11px] hover:underline hover:text-rose-300">{member.overdue}</button>
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
                  <td colSpan={13} className="p-8 text-center text-zinc-500 font-mono text-xs">
                    No staff members found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      {selectedTasks && !selectedTaskDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">{popupTitle}</h2>
                <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-widest">{new Set(selectedTasks.map(t => t.orderId)).size} Unique Tasks Found</p>
              </div>
              <button 
                onClick={() => setSelectedTasks(null)}
                className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-zinc-800">
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Order ID</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Customer Name</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Event Name(s)</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Current Status</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Target Delivery Date</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Assigned Staff Count</th>
                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {Array.from(new Map(selectedTasks.map(t => [t.orderId, t])).values()).map((task: any, i: number) => (
                      <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4 text-zinc-300 font-mono text-[11px] font-medium">{task.orderId}</td>
                        <td className="p-4 text-zinc-200 text-sm font-medium">{task.customerName}</td>
                        <td className="p-4 text-zinc-400 text-xs">{task.eventNames}</td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-300">
                            {task.currentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-400 font-mono text-[11px]">
                          {task.targetDate !== 'N/A' && !isNaN(new Date(task.targetDate).getTime()) ? new Date(task.targetDate).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="p-4 text-center text-zinc-300 font-mono">{task.assigned_staff_count}</td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => setSelectedTaskDetails(task)}
                            className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedTasks.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono text-xs">No tasks found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTaskDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-zinc-900">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Order Task Breakdown</h2>
                <p className="text-xs text-zinc-500 font-mono mt-1 uppercase tracking-widest">{selectedTaskDetails.orderId} - {selectedTaskDetails.customerName}</p>
              </div>
              <button 
                onClick={() => setSelectedTaskDetails(null)}
                className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {selectedTaskDetails.eventGroups.map((group: any, idx: number) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <h3 className="text-lg font-bold text-zinc-200">{group.eventName}</h3>
                  </div>
                  
                  <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800/50">
                     <p className="text-xs text-zinc-400 font-mono mb-4">
                       <span className="text-zinc-500 uppercase tracking-widest">Team Member Included:</span> {group.teamIncluded}
                     </p>

                     {group.assignments && group.assignments.length > 0 ? (
                       <div className="overflow-hidden rounded-lg border border-zinc-800/50">
                         <table className="w-full text-left border-collapse">
                           <thead>
                             <tr className="bg-zinc-900/50 border-b border-zinc-800/50">
                               <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Assigned Staff</th>
                               <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Staff Type</th>
                               <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Assigned Role</th>
                               <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Assigned Deliverable</th>
                               <th className="p-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">Current Status</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-800/50">
                             {group.assignments.map((assignment: any, i2: number) => (
                               <tr key={i2} className="hover:bg-zinc-900/30 transition-colors">
                                 <td className="p-3 text-zinc-200 text-xs font-medium">{assignment.staffName}</td>
                                 <td className="p-3 text-zinc-400 font-mono text-[10px]">{assignment.staffType}</td>
                                 <td className="p-3 text-zinc-400 text-xs">{assignment.role}</td>
                                 <td className="p-3 text-zinc-300 text-xs">{assignment.deliverable}</td>
                                 <td className="p-3">
                                   <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-medium text-zinc-300">
                                     {assignment.status}
                                   </span>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     ) : (
                       <p className="text-xs text-zinc-600 font-mono italic">No specific assignments found for this event.</p>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
