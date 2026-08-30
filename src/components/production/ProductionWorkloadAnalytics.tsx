import React from 'react';
import { BarChart3, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useRole } from '../RoleContext';

export const ProductionWorkloadAnalytics: React.FC = () => {
  const { staff = [], editorAssignments = [], production = [] } = useRole();

  const prodStaff = (staff || []).filter(s => 
    s.status === 'Active' && 
    (s.department === 'Production' || s.role?.toLowerCase().includes('editor') || s.role?.toLowerCase().includes('production') || s.role?.toLowerCase().includes('album'))
  );

  const workloadByStaff = prodStaff.map(s => {
    const assignedTasks = (editorAssignments || []).filter(ea => ea.staff_id === s.staff_id || ea.staff_name === s.name);
    const activeTasks = assignedTasks.filter(t => !['Completed', 'Approved', 'Project Completed'].includes(t.status));
    const completedTasks = assignedTasks.filter(t => ['Completed', 'Approved', 'Project Completed'].includes(t.status));

    return {
      staff: s,
      total: assignedTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length
    };
  });

  return (
    <div className="space-y-4 font-mono">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span>Editor Workload & Completion Analytics</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workloadByStaff.map(({ staff: s, total, active, completed }) => (
          <div key={s.staff_id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
              <div>
                <h4 className="text-sm font-bold text-white">{s.name}</h4>
                <span className="text-xs text-purple-400 font-bold">{s.role || s.department}</span>
              </div>
              <span className="text-xs text-zinc-400 font-bold">{total} Total Assigned Deliverables</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-500 block uppercase">Total</span>
                <strong className="text-white text-base block font-bold">{total}</strong>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-500 block uppercase">In Editing</span>
                <strong className="text-amber-400 text-base block font-bold">{active}</strong>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2">
                <span className="text-[10px] text-zinc-500 block uppercase">Completed</span>
                <strong className="text-emerald-400 text-base block font-bold">{completed}</strong>
              </div>
            </div>

            {/* Workload Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Completion Rate</span>
                <span>{total > 0 ? Math.round((completed / total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
