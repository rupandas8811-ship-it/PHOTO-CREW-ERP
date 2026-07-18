const fs = require('fs');
let content = fs.readFileSync('src/components/UnifiedCalendar.tsx', 'utf8');

// Replace status logic
content = content.replace(
  `        const statusClean = (ld.status || ld.current_status || '').trim();\n        if (statusClean !== 'Order Confirmed') return;`,
  `        const statusClean = (ld.status || ld.current_status || '').trim();\n        const preOrderStatuses = ['New Lead', 'Contacted', 'Follow Up', 'Follow-up', 'Quotation Sent', 'Negotiation', 'Lost Lead'];\n        const completedStatuses = ['Delivered', 'Project Completed', 'Completed', 'Event Cancelled', 'Closed', 'Project Closed', 'Approved', 'Project Delivered'];\n        if (preOrderStatuses.includes(statusClean)) return;\n        if (completedStatuses.includes(statusClean)) return;`
);

// Map the new fields in raw
content = content.replace(
  `              ...ev,\n              lead_id: ld.lead_id,\n              order_id: ld.lead_id,\n              event_name: evName,\n              event_type: evType,\n              event_date: evDate,\n              event_start_time: evStartTime,`,
  `              ...ev,\n              lead_id: ld.lead_id,\n              order_id: ld.lead_id,\n              event_name: evName,\n              event_type: evType,\n              event_date: evDate,\n              event_start_time: evStartTime,\n              event_end_time: ev.event_end_time || ev.event_end_time || '',\n              reporting_date: ev.reporting_date || '',\n              reporting_time: ev.reporting_time || '',`
);

fs.writeFileSync('src/components/UnifiedCalendar.tsx', content);
