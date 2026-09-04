const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `            const historyRecord = {
              lead_id: booking.leadId || null,
              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: 'Event Start Photo Proof',`,
  `            const historyRecord = {
              lead_id: booking.leadId || null,
              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: 'Event Start',` // use proper eq name
);

code = code.replace(
  `          // Save Event Complete to history
          if (stage === 'Event Complete') {
            for (const p of uploadedProofs) {
              await pushInsert('lead_equipment_history', {`,
  `          // Save Event Complete to history
          if (stage === 'Event Complete') {
            for (const p of uploadedProofs) {
              await pushInsert('lead_equipment_history', {`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
