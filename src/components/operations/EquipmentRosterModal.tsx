import React, { useMemo } from 'react';
import { X, Calendar, Clock, MapPin, Wrench, User, Briefcase, Hash, ClipboardList } from 'lucide-react';
import { useRole } from '../RoleContext';
import { Equipment } from '../../types';
import { formatDateDDMMYY, formatTime12Hour } from "../../utils";

export interface ActiveEquipmentTask {
  id: string;
  orderId: string;
  leadId?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  assignedStaff: string;
  taskStatus: string;
  source: string;
}

interface EquipmentRosterModalProps {
  equipmentTarget: Equipment;
  onClose: () => void;
}

export const EquipmentRosterModal: React.FC<EquipmentRosterModalProps> = ({ equipmentTarget, onClose }) => {
  const {
    leadEquipmentHistory,
    equipmentHandovers,
    staffAssignments,
    operations,
    orders,
    leads
  } = useRole();

  const getActiveTasksForEquipment = (eq: Equipment): ActiveEquipmentTask[] => {
    if (!eq) return [];
    const eqId = (eq.equipment_id || '').trim().toLowerCase();
    const eqName = (eq.equipment_name || '').trim().toLowerCase();
    const brand = (eq.brand || '').trim().toLowerCase();
    const model = (eq.model || '').trim().toLowerCase();
    const fullName = `${brand} ${model}`.trim().toLowerCase();

    // Matching helper
    const matchesEquipment = (raw: string): boolean => {
      if (!raw) return false;
      const clean = raw.trim().toLowerCase();
      if (eqId && clean === eqId) return true;
      if (eqName && (clean === eqName || clean.includes(eqName) || eqName.includes(clean))) return true;
      if (fullName && clean === fullName) return true;
      if (model && model.length > 2 && clean.includes(model)) return true;
      return false;
    };

    const completedStages = [
      'cancelled', 'canceled', 'completed', 'event completed', 'event ended',
      'project completed', 'closed', 'order closed', 'project closed', 'delivered', 'project delivered',
      'footage handover', 'equipment handover completed', 'returned', 'lost lead', 'lost', 'rejected'
    ];

    const isReturnedForOrder = (ordId?: string, ldId?: string): boolean => {
      if (!ordId && !ldId) return false;
      
      const hasHistoryReturn = (leadEquipmentHistory || []).some(h => {
        const orderMatch = (ordId && h.order_id === ordId) || (ldId && h.lead_id === ldId);
        if (!orderMatch) return false;
        const nameMatch = matchesEquipment(h.equipment_name) || 
                          h.equipment_name === 'Equipment Handover Photo Proof' ||
                          h.equipment_name === 'Asset Return Photo Proof' ||
                          h.equipment_status === 'Equipment Handover Completed';
        const isRet = h.equipment_status === 'Equipment Handover Completed' || 
                      h.equipment_status === 'Returned' || 
                      Boolean(h.returned_at && (h.equipment_status?.toLowerCase().includes('handover') || h.equipment_status?.toLowerCase().includes('return')));
        return nameMatch && isRet;
      });
      if (hasHistoryReturn) return true;

      const hasHandoverReturn = (equipmentHandovers || []).some(eh => {
        const orderMatch = (ordId && eh.order_id === ordId) || (ldId && eh.order_id === ldId);
        return orderMatch && eh.return_status === 'Returned' && matchesEquipment(eh.equipment_name);
      });
      if (hasHandoverReturn) return true;

      const matchingOp = (operations || []).find(o => (ordId && o.order_id === ordId) || (ldId && o.order_id === ldId));
      if (matchingOp && ['equipment handover completed', 'returned', 'equipment returned'].includes((matchingOp.equipment_status || '').toLowerCase())) {
        return true;
      }

      return false;
    };

    const tasks: ActiveEquipmentTask[] = [];
    const seenOrderKeys = new Set<string>();

    // 1. Check staffAssignments
    (staffAssignments || []).forEach(sa => {
      const assignStatus = (sa.assignment_status || '').toLowerCase();
      const taskStatus = ((sa as any).task_status || '').toLowerCase();
      
      const relatedOrder = orders?.find(o => o.order_id === sa.order_id);
      const relatedLead = leads?.find(l => l.lead_id === (relatedOrder?.lead_id || sa.order_id) || l.lead_id === (sa as any).lead_id);
      
      const op = operations?.find(o => o.order_id === (sa.order_id || relatedOrder?.order_id));

      let saEqList: string[] = [];
      if (Array.isArray(sa.equipment)) {
        saEqList = sa.equipment;
      } else if (typeof sa.equipment === 'string') {
        try {
          const parsed = JSON.parse(sa.equipment);
          saEqList = Array.isArray(parsed) ? parsed : [sa.equipment];
        } catch {
          saEqList = (sa.equipment as string).split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const isAssigned = saEqList.some(item => matchesEquipment(item));
      if (!isAssigned) return;

      const taskKey = `${sa.order_id}_${sa.event_name || sa.event_id || 'ev'}_${sa.staff_name}`;
      if (seenOrderKeys.has(taskKey)) return;
      seenOrderKeys.add(taskKey);

      tasks.push({
        id: sa.id,
        orderId: sa.order_id,
        leadId: relatedLead?.lead_id,
        eventName: sa.event_name || relatedLead?.events?.find((e:any) => e.id === sa.event_id)?.event_name || relatedOrder?.event_name || 'Event Assignment',
        eventDate: sa.event_date || relatedOrder?.event_date || relatedLead?.event_date || '',
        eventTime: sa.reporting_time || '',
        assignedStaff: sa.staff_name || 'Crew Member',
        taskStatus: sa.assignment_status || 'Assigned',
        source: 'Operations Roster'
      });
    });

    // 2. Check operations (fallback)
    (operations || []).forEach(op => {
      const relatedOrder = orders?.find(o => o.order_id === op.order_id);
      const relatedLead = leads?.find(l => l.lead_id === (relatedOrder?.lead_id || op.order_id));
      
      const eqFields = [
        { staff: op.photographer_assigned, kits: op.equipment_kit },
        { staff: op.videographer_assigned, kits: op.equipment_kit },
        { staff: op.drone_operator_assigned, kits: op.equipment_kit },
        { staff: op.assistant_assigned, kits: op.equipment_kit }
      ];

      eqFields.forEach(field => {
        if (!field.staff || field.staff === 'None') return;
        if (!field.kits) return;

        const eqList = field.kits.split(',').map((s: string) => s.trim());
        if (!eqList.some((item: string) => matchesEquipment(item))) return;

        const taskKey = `${op.order_id}_${field.staff}`;
        if (seenOrderKeys.has(taskKey)) return;
        seenOrderKeys.add(taskKey);

        tasks.push({
          id: op.operation_id,
          orderId: op.order_id,
          leadId: relatedLead?.lead_id,
          eventName: op.event_name || relatedOrder?.event_name || relatedLead?.event_name || 'Production Event',
          eventDate: op.event_date || relatedOrder?.event_date || relatedLead?.event_date || '',
          eventTime: op.reporting_time || '',
          assignedStaff: field.staff,
          taskStatus: op.event_status || 'Scheduled',
          source: 'Operations Module'
        });
      });
    });

    // Sort by date (latest first)
    return tasks.sort((a, b) => {
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
    });
  };

  const tasks = useMemo(() => getActiveTasksForEquipment(equipmentTarget), [equipmentTarget, leadEquipmentHistory, equipmentHandovers, staffAssignments, operations, orders, leads]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              Equipment Roster
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-zinc-300">
                {equipmentTarget.equipment_name}
              </span>
              {equipmentTarget.equipment_id && (
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">
                  ID: {equipmentTarget.equipment_id}
                </span>
              )}
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                {tasks.length} Assignments
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-10 h-10 text-zinc-700 mx-auto mb-3 opacity-50" />
              <p className="text-zinc-400 font-mono text-sm">No assignment history found for this equipment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={`${task.id}-${idx}`} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-700 transition-colors">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {task.eventName}
                      </span>
                      {task.leadId && (
                        <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                          ID: {task.leadId}
                        </span>
                      )}
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        ['completed', 'returned', 'closed'].some(s => task.taskStatus.toLowerCase().includes(s)) 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {task.taskStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-bold text-zinc-300">{task.assignedStaff}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{formatDateDDMMYY(task.eventDate)}</span>
                      </div>
                      {task.eventTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{formatTime12Hour(task.eventTime)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[10px]">{task.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
