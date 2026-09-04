const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `            await pushInsert('lead_equipment_history', {
              lead_id: booking.leadId || null,
              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: eqItem.name,
              equipment_status: 'Equipment Handover Completed',`,
  `            await pushInsert('lead_equipment_history', {
              lead_id: booking.leadId || null,
              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: 'Equipment Handover',
              equipment_status: 'Equipment Handover Completed',`
);

code = code.replace(
  `            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            assignment_id: booking.assignmentId || null,
            equipment_name: 'Footage Handover',
            equipment_status: 'Footage Handover Completed',`,
  `            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            assignment_id: booking.assignmentId || null,
            equipment_name: 'Equipment Handover',
            equipment_status: 'Footage Handover Completed',`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
