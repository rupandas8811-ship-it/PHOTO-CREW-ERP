import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

start_idx = content.find('  const isEquipmentBusy = (equipmentName: string,')
end_idx = content.find('  const getAssignedStaffDetailsForOrder = (ord: Order): AssignedStaffDetails[] => {')

if start_idx != -1 and end_idx != -1:
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

    // 1. Staff Assignments
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

    // 2. Operations equipment kit (if not already handled by staff assignments)
    (operations || []).forEach(op => {
      if (currentOrderId && op.order_id === currentOrderId) return;
      if (!op.equipment_kit || !op.equipment_kit.trim()) return;

      if (['completed', 'event completed', 'cancelled'].includes((op.event_status || '').toLowerCase())) return;
      if (['equipment handover completed', 'returned', 'equipment returned'].includes((op.equipment_status || '').toLowerCase())) return;

      const relatedOrder = orders.find(o => o.order_id === op.order_id);
      if (!relatedOrder || isCompletedEvent(relatedOrder)) return;

      const relatedLead = leads.find(l => l.lead_id === relatedOrder.lead_id);
      if (!relatedLead || relatedLead.status === 'Lost Lead') return;

      if (isReturnedForOrder(op.order_id, relatedOrder?.lead_id)) return;

      const opKits = op.equipment_kit.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      const match = opKits.includes(cleanEqName);
      if (!match) return;

      let evDate = relatedOrder.event_date || relatedLead.event_date;
      let evStart = relatedOrder.reporting_time || '';
      let evEnd = relatedOrder.event_end_time || '';
      let evName = relatedOrder.event_type || 'Event';
      
      // Assume operation applies to all events or the first one if we can't pinpoint it,
      // but usually operations are 1-1 with order. If the order has multiple events, it applies to the whole order.
      // To be safe, we add a general schedule for the order dates.
      if (relatedLead.events && relatedLead.events.length > 0) {
        relatedLead.events.forEach((ev: any) => {
          allSchedules.push({
            staffName: 'Crew',
            eventName: ev.event_name || ev.event_type || evName,
            eventDate: ev.event_date || evDate || '',
            startTime: ev.event_start_time || ev.reporting_time || evStart,
            endTime: ev.event_end_time || evEnd
          });
        });
      } else {
        allSchedules.push({
          staffName: 'Crew',
          eventName: evName,
          eventDate: evDate || '',
          startTime: evStart,
          endTime: evEnd
        });
      }
    });

    if (targetDate) {
      result.schedule = allSchedules.filter(s => s.eventDate === targetDate);
      
      for (const s of result.schedule) {
         if (targetStartTime && s.startTime) {
            // We have both requested start time and existing start time. Let's check overlap.
            // If checkTimeOverlap returns true, it means they overlap
            if (checkTimeOverlap(targetStartTime, targetEndTime, s.startTime, s.endTime)) {
              result.isBusy = true;
              result.conflicts.push(s);
            }
         } else {
            // If either is missing, we must assume conflict on the same date to be safe.
            result.isBusy = true;
            result.conflicts.push(s);
         }
      }
    } else {
      // If we don't have a targetDate, we just check if it's currently busy at all (for generic listing)
      // Usually generic listing doesn't know the date, so we assume available unless we find an assignment for TODAY?
      // Actually `isEquipmentBusy` was previously returning true if *any* assignment existed.
      // Let's keep that behavior for general checks (when targetDate is not provided)
      if (allSchedules.length > 0) {
        result.isBusy = true;
        result.statusText = "Assigned to another active event";
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
    print("Failed")
