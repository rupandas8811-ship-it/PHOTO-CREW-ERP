import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# 1. Replace state assignForm -> eventAllocations
state_old = """  const [assignForm, setAssignForm] = useState({
    photographer_assigned: '',
    videographer_assigned: '',
    drone_operator_assigned: '',
    assistant_assigned: '',
    equipment_kit: '',
    reporting_time: '08:00',
    remarks: '',
    event_status: 'Assigned' as 'Assigned' | 'Completed' | 'Event Scheduled' | 'Event Completed' | 'Raw Footage Received' | string,
    current_stage: 'Order Confirmed' as CurrentStage,
    raw_footage_link: '',
    event_date: '',
    event_time: '10:00'
  });"""
state_new = """  const [eventAllocations, setEventAllocations] = useState<Record<string, {
    reporting_date: string;
    reporting_time: string;
    event_start_time: string;
    event_end_time: string;
    staff: { staff_role: string, staff_id: string, staff_name: string }[];
  }>>({});"""
content = content.replace(state_old, state_new)

# 2. Update startAssigning
startAssigning_old = """  const startAssigning = (order: Order) => {
    const op = getOpDetails(order.order_id);
    const rf = rawFootage ? rawFootage.find(f => f.order_id === order.order_id) : null;
    
    // Check if this is a brand new assignment (Order Confirmed stage means it has not been assigned yet)
    const isNewAssignment = order.current_stage === 'Order Confirmed';

    // Load existing staff assignments for this order EXCEPT if starting a fresh allocation
    const existing = isNewAssignment ? [] : (staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : []);
    setActiveAssignments(existing.map(e => ({
      staff_role: e.staff_role,
      staff_id: e.staff_id,
      staff_name: e.staff_name
    })));

    setAssignForm({
      photographer_assigned: isNewAssignment ? '' : (op?.photographer_assigned || ''),
      videographer_assigned: isNewAssignment ? '' : (op?.videographer_assigned || ''),
      drone_operator_assigned: isNewAssignment ? '' : (op?.drone_operator_assigned || ''),
      assistant_assigned: isNewAssignment ? '' : (op?.assistant_assigned || ''),
      equipment_kit: isNewAssignment ? '' : (op?.equipment_kit || ''),
      reporting_time: order.reporting_time || op?.reporting_time || '08:00',
      remarks: isNewAssignment ? '' : (op?.remarks || ''),
      event_status: 'Event Scheduled',
      current_stage: order.current_stage || 'Event Scheduled',
      raw_footage_link: isNewAssignment ? '' : (rf?.server_path || ''),
      event_date: order.event_date || op?.event_date || '',
      event_time: order.event_time || op?.event_time || ''
    });

    setAssigningOrderId(order.order_id);
    
    // Initialize selectedKits
    const kits = isNewAssignment ? [] : (op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    setSelectedKits(kits);
    setEquipmentSearchQuery('');
    setIsEquipmentDropdownOpen(false);
    
    // Default selected values
    setSelectedRole('Lead Photographer');
    setSelectedStaff('');
  };"""

startAssigning_new = """  const startAssigning = (order: Order) => {
    const op = getOpDetails(order.order_id);
    const isNewAssignment = order.current_stage === 'Order Confirmed';
    const existingStaff = staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : [];
    
    let opRemarks: any = {};
    if (op?.remarks && op.remarks.startsWith('{')) {
      try { opRemarks = JSON.parse(op.remarks); } catch(e) {}
    }
    const reportingData = opRemarks.event_reporting || {};

    const allocations: Record<string, any> = {};
    
    const parentLd = leads?.find(l => l.lead_id === order.lead_id);
    const evts = parentLd?.events || [];
    
    evts.forEach(ev => {
      const eid = ev.id || 'N/A';
      
      const rep = reportingData[eid] || {};
      const staffForEv = existingStaff
        .filter(s => s.staff_role.includes(`|${eid}`))
        .map(s => ({
          staff_role: s.staff_role.split('|')[0],
          staff_id: s.staff_id,
          staff_name: s.staff_name
        }));

      allocations[eid] = {
        reporting_date: rep.reporting_date || ev.event_date || order.event_date || '',
        reporting_time: rep.reporting_time || op?.reporting_time || order.reporting_time || '08:00',
        event_start_time: rep.event_start_time || ev.event_start_time || order.event_time || '',
        event_end_time: rep.event_end_time || ev.event_end_time || '',
        staff: staffForEv
      };
    });

    setEventAllocations(allocations);
    setAssigningOrderId(order.order_id);
  };"""
content = content.replace(startAssigning_old, startAssigning_new)

# write the modified content back
with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
print("done")
