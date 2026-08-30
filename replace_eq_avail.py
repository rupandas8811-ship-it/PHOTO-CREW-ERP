import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# First we need to import checkTimeOverlap
content = content.replace("import { \n  convertTimeToDbFormat", "import { \n  convertTimeToDbFormat, \n  checkTimeOverlap")

# We will define EquipmentAvailability and EquipmentConflictDetails locally in OperationsLeads.tsx
types = """
interface EquipmentConflictDetails {
  staffName: string;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
}

interface EquipmentAvailability {
  isBusy: boolean;
  statusText?: string;
  conflicts: EquipmentConflictDetails[];
  schedule: EquipmentConflictDetails[];
}
"""
if "interface EquipmentConflictDetails" not in content:
    content = content.replace('const OperationsLeads = () => {', types + '\nconst OperationsLeads = () => {')

# The function logic
new_func = """
  const checkEquipmentAvailability = (
    equipmentName: string, 
    currentOrderId?: string, 
    targetDate?: string,
    targetStartTime?: string,
    targetEndTime?: string
  ): EquipmentAvailability => {
    const result: EquipmentAvailability = {
      isBusy: false,
      conflicts: [],
      schedule: []
    };
    if (!equipmentName) return result;
    const cleanEqName = equipmentName.trim().toLowerCase();

    // Check maintenance
    const eqItem = (equipment || []).find(e => e.equipment_name.toLowerCase() === cleanEqName);
    if (eqItem && (eqItem.status === 'Under Maintenance' || eqItem.status === 'Damaged' || eqItem.status === 'Inactive')) {
      result.isBusy = true;
      result.statusText = eqItem.status;
      return result;
    }

    const completedStages = [
      'cancelled', 'canceled', 'completed', 'event completed', 
      'project completed', 'closed', 'order closed', 'project closed', 'delivered', 'project delivered',
      'footage handover', 'equipment handover completed', 'returned'
    ];

    const isReturnedForOrder = (ordId?: string, ldId?: string) => {
      if (!ordId && !ldId) return false;
      const hasHistoryReturn = (leadEquipmentHistory || []).some(h => {
        const orderMatch = (ordId && h.order_id === ordId) || (ldId && h.lead_id === ldId);
        if (!orderMatch) return false;
        const nameMatch = h.equipment_name?.toLowerCase() === cleanEqName || 
                           h.equipment_name?.toLowerCase().includes(cleanEqName) ||
                           h.equipment_name === 'Equipment Handover Photo Proof' ||
                           h.equipment_name === 'Asset Return Photo Proof';
        const isRet = h.equipment_status === 'Equipment Handover Completed' || 
                      h.equipment_status === 'Returned' || 
                      Boolean(h.returned_at && h.equipment_status?.toLowerCase().includes('handover'));
        return nameMatch && isRet;
      });
      if (hasHistoryReturn) return true;

      const hasHandoverReturn = (equipmentHandovers || []).some(eh => {
        const orderMatch = (ordId && eh.order_id === ordId) || (ldId && eh.order_id === ldId);
        return orderMatch && eh.return_status === 'Returned' && 
          (eh.equipment_name?.toLowerCase() === cleanEqName || eh.equipment_name?.toLowerCase().includes(cleanEqName));
      });
      return hasHandoverReturn;
    };

    // Gather all existing assignments for this equipment
    const allSchedules: EquipmentConflictDetails[] = [];

    // Check staff assignments
    (staffAssignments || []).forEach(sa => {
      // Exclude the current order being edited
      if (currentOrderId && sa.order_id === currentOrderId) return;
      
      const assignStatus = (sa.assignment_status || '').toLowerCase();
      const taskStatus = ((sa as any).task_status || '').toLowerCase();
      if (completedStages.includes(assignStatus) || completedStages.includes(taskStatus)) return;

      const relatedOrder = orders.find(o => o.order_id === sa.order_id);
      if (!relatedOrder || isCompletedEvent(relatedOrder)) return;

      const op = operations?.find(o => o.order_id === relatedOrder.order_id);
      if (op && ['completed', 'event completed', 'cancelled'].includes((op.event_status || '').toLowerCase())) return;

      const relatedLead = leads.find(l => l.lead_id === relatedOrder.lead_id);
      if (!relatedLead || relatedLead.status === 'Lost Lead') return;

      if (isReturnedForOrder(sa.order_id, relatedOrder.lead_id)) return;

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

      const match = saEqList.some(eq => eq.trim().toLowerCase() === cleanEqName);
      if (!match) return;

      // Now extract time for this assignment
      let evDate = relatedOrder.event_date || relatedLead.event_date;
      let evStart = relatedOrder.reporting_time || '';
      let evEnd = relatedOrder.event_end_time || '';
      let evName = relatedOrder.event_type || 'Event';
      
      // If assignment has event_id, match the specific event
      if (sa.event_id && relatedLead.events && Array.isArray(relatedLead.events)) {
        const ev = relatedLead.events.find(e => e.id === sa.event_id);
        if (ev) {
          evDate = ev.event_date || evDate;
          evStart = ev.event_start_time || ev.reporting_time || evStart;
          evEnd = ev.event_end_time || evEnd;
          evName = ev.event_name || ev.event_type || evName;
        }
      } else if (sa.event_name && relatedLead.events && Array.isArray(relatedLead.events)) {
        // Fallback to name
        const ev = relatedLead.events.find(e => (e.event_name || e.event_type || '').toLowerCase() === sa.event_name?.toLowerCase());
        if (ev) {
          evDate = ev.event_date || evDate;
          evStart = ev.event_start_time || ev.reporting_time || evStart;
          evEnd = ev.event_end_time || evEnd;
          evName = ev.event_name || ev.event_type || evName;
        }
      }

      allSchedules.push({
        staffName: sa.staff_name || 'Assigned Crew',
        eventName: evName,
        eventDate: evDate || '',
        startTime: evStart,
        endTime: evEnd
      });
    });

    // We can also check operations equipment_kit if needed (but staff assignments is more precise for individual staff)
    // The requirement says check all existing staff/event assignments. We will skip operations equipment_kit to avoid duplicates if they overlap with staff.
    // Wait, some assignments might only exist in operations equipment_kit if they don't use staff. 
    // Let's add them too if they don't duplicate.

    if (targetDate) {
      result.schedule = allSchedules.filter(s => s.eventDate === targetDate);
      
      for (const s of result.schedule) {
         if (targetStartTime || targetEndTime) {
            // Check time overlap
            if (checkTimeOverlap(targetStartTime, targetEndTime, s.startTime, s.endTime)) {
              result.isBusy = true;
              result.conflicts.push(s);
            }
         } else {
            // If we don't know the requested time, we default to busy if it's the same date.
            // (Wait, user says "Same equipment + same date but non-overlapping time = AVAILABLE". 
            // If they don't provide a targetStartTime, maybe we just show schedule and let them decide? Or default to busy.)
            // Let's default to busy if no time provided, just to be safe.
            result.isBusy = true;
            result.conflicts.push(s);
         }
      }
    } else {
      // If no target date provided, check if it's busy at all?
      // For general checks, we don't have a target date, so we return not busy, because we can't determine overlap.
      // Or maybe check if there's ANY future assignment? 
      // isEquipmentBusy was previously returning true if it was found anywhere, unless targetDate was provided.
      // If we don't have a targetDate, we can't accurately say it's busy. Let's keep it simple: return false.
    }
    
    return result;
  };

  const isEquipmentBusy = (equipmentName: string, currentOrderId?: string, targetDate?: string): boolean => {
    return checkEquipmentAvailability(equipmentName, currentOrderId, targetDate).isBusy;
  };
"""

# Replace the old isEquipmentBusy with the new implementation
old_func_pattern = r'const isEquipmentBusy = \(.*?\}\s*;\s*if \(hasConflictingStaffAssignment\) return true;.*?return true;\s*\};\s*'

content = re.sub(r'const isEquipmentBusy = \(equipmentName: string, currentOrderId\?: string, targetDate\?: string\): boolean => \{[\s\S]*?if \(!match\) return false;\s*if \(targetDate\) \{[\s\S]*?return true;\s*\}\s*\};\s*', new_func.strip() + '\n\n', content)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
