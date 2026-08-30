import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# I will find the start of `const isEquipmentBusy = ` and the end of it which is before the next function.
# Let's find the exact indices
start_idx = content.find('const isEquipmentBusy = (equipmentName: string, currentOrderId?: string, targetDate?: string): boolean => {')

if start_idx != -1:
    # Find the end by looking for the next function definition or comment
    end_idx = content.find('// Assign Form Validation', start_idx)
    if end_idx == -1:
        end_idx = content.find('const validateAssignmentForm', start_idx)
        if end_idx != -1:
            # step back one line
            end_idx = content.rfind('\n', start_idx, end_idx)

    if end_idx != -1:
        old_code = content[start_idx:end_idx]
        
        new_code = """
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

    const allSchedules: EquipmentConflictDetails[] = [];

    (staffAssignments || []).forEach(sa => {
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

      let evDate = relatedOrder.event_date || relatedLead.event_date;
      let evStart = relatedOrder.reporting_time || '';
      let evEnd = relatedOrder.event_end_time || '';
      let evName = relatedOrder.event_type || 'Event';
      
      if (sa.event_id && relatedLead.events && Array.isArray(relatedLead.events)) {
        const ev = relatedLead.events.find(e => e.id === sa.event_id);
        if (ev) {
          evDate = ev.event_date || evDate;
          evStart = ev.event_start_time || ev.reporting_time || evStart;
          evEnd = ev.event_end_time || evEnd;
          evName = ev.event_name || ev.event_type || evName;
        }
      } else if (sa.event_name && relatedLead.events && Array.isArray(relatedLead.events)) {
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

    if (targetDate) {
      result.schedule = allSchedules.filter(s => s.eventDate === targetDate);
      
      for (const s of result.schedule) {
         if (targetStartTime || targetEndTime) {
            if (checkTimeOverlap(targetStartTime, targetEndTime, s.startTime, s.endTime)) {
              result.isBusy = true;
              result.conflicts.push(s);
            }
         } else {
            result.isBusy = true;
            result.conflicts.push(s);
         }
      }
    }
    
    return result;
  };

  const isEquipmentBusy = (equipmentName: string, currentOrderId?: string, targetDate?: string): boolean => {
    return checkEquipmentAvailability(equipmentName, currentOrderId, targetDate).isBusy;
  };
"""
        content = content[:start_idx] + new_code + '\n' + content[end_idx:]
        
        with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
            f.write(content)
        print("Success")
    else:
        print("Could not find end index")
else:
    print("Could not find start index")
