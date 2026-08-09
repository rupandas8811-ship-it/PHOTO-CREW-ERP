const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const target = `      events.forEach((evt: any) => {
        const evtId = evt ? evt.id : (prod?.event_id || order?.event_type || l?.event_type || 'EVT-01');
        const evtName = evt ? (evt.event_name || evt.event_type || '') : '';
        
        const evtAssignments = cand.assignments?.filter((ea: any) => !evt || !ea.event_id || ea.event_id === evtId) || [];
        
        const evtDate = evt ? evt.event_date : (order?.event_date || l?.event_date || '');
        const defaultTargetDate = evtDate ? new Date(new Date(evtDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
        
        let computedTargetDate = defaultTargetDate;
        if (evtAssignments.length > 0 && evtAssignments[0].target_finish_date) {
            computedTargetDate = evtAssignments[0].target_finish_date;
        } else if (prod?.target_delivery_date) {
            computedTargetDate = prod.target_delivery_date;
        } else if ((l as any)?.delivery_target_date) {
            computedTargetDate = (l as any)?.delivery_target_date;
        }

        const candidateObj = {
          ...(prod || {}),
          production_id: prodId,
          tracking_id: trackingId,
          order_id: order?.order_id || prod?.order_id || trackingId,
          lead_id: l?.lead_id || order?.lead_id || trackingId,
          event_id: evtId,
          custom_event_name: evtName,
          customer_name: order?.customer_name || l?.customer_name || prod?.customer_name || 'Client',
          customer_mobile: order?.customer_phone || order?.mobile || l?.mobile || prod?.customer_mobile || '',
          editor_assigned: prod?.editor_assigned || (l as any)?.assigned_editor || 'Unassigned',
          assigned_staff: prod?.assigned_staff || (l as any)?.assigned_editors || '',
          raw_footage_location: prod?.raw_footage_location || rf?.server_path || order?.raw_footage_link || '',
          editing_status: computedStatus,
          remarks: prod?.remarks || l?.remarks || order?.remarks || '',
          project_priority: prod?.project_priority || 'Medium',
          target_delivery_date: computedTargetDate,
          expected_delivery_date: prod?.expected_delivery_date || computedTargetDate,
          event_date: evtDate,
          event_time: evt ? evt.event_time : (order?.event_time || l?.event_time || ''),
        };

        candidatesList.push(candidateObj);
      });`;

const replacement = `      const evt = events[0];
      const evtId = evt ? evt.id : (prod?.event_id || order?.event_type || l?.event_type || 'EVT-01');
      const evtName = events.length > 1 ? \`\${events.length} Events\` : (evt ? (evt.event_name || evt.event_type || '') : '');
      
      const evtAssignments = cand.assignments?.filter((ea: any) => !evt || !ea.event_id || ea.event_id === evtId) || [];
      
      const evtDate = events.length > 1 ? 'Multiple Dates' : (evt ? evt.event_date : (order?.event_date || l?.event_date || ''));
      const defaultTargetDate = evtDate && evtDate !== 'Multiple Dates' ? new Date(new Date(evtDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';
      
      let computedTargetDate = events.length > 1 ? 'Multiple Dates' : defaultTargetDate;
      if (events.length === 1) {
        if (evtAssignments.length > 0 && evtAssignments[0].target_finish_date) {
            computedTargetDate = evtAssignments[0].target_finish_date;
        } else if (prod?.target_delivery_date) {
            computedTargetDate = prod.target_delivery_date;
        } else if ((l as any)?.delivery_target_date) {
            computedTargetDate = (l as any)?.delivery_target_date;
        }
      }

      // Build unique team member count for "Assigned Team" column
      const uniqueEditors = new Set();
      (cand.assignments || []).forEach(a => {
        if (a.staff_name && a.staff_name !== 'Unassigned') {
          uniqueEditors.add(a.staff_name);
        }
      });
      const teamCount = uniqueEditors.size;

      const candidateObj = {
        ...(prod || {}),
        production_id: prodId,
        tracking_id: trackingId,
        order_id: order?.order_id || prod?.order_id || trackingId,
        lead_id: l?.lead_id || order?.lead_id || trackingId,
        event_id: evtId,
        custom_event_name: evtName,
        customer_name: order?.customer_name || l?.customer_name || prod?.customer_name || 'Client',
        customer_mobile: order?.customer_phone || order?.mobile || l?.mobile || prod?.customer_mobile || '',
        editor_assigned: prod?.editor_assigned || (l as any)?.assigned_editor || 'Unassigned',
        assigned_staff: prod?.assigned_staff || (l as any)?.assigned_editors || '',
        raw_footage_location: prod?.raw_footage_location || rf?.server_path || order?.raw_footage_link || '',
        editing_status: computedStatus,
        remarks: prod?.remarks || l?.remarks || order?.remarks || '',
        project_priority: prod?.project_priority || 'Medium',
        target_delivery_date: computedTargetDate,
        expected_delivery_date: prod?.expected_delivery_date || computedTargetDate,
        event_date: evtDate,
        event_time: events.length > 1 ? '—' : (evt ? evt.event_time : (order?.event_time || l?.event_time || '')),
        all_events: events,
        team_count: teamCount
      };

      candidatesList.push(candidateObj);`;

if (content.includes(target)) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(target, replacement));
  console.log("Successfully patched leads map!");
} else {
  console.log("Target not found!");
}
