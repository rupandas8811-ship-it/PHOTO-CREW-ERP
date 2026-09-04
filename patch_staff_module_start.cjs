const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            assignment_id: booking.assignmentId || null,
            equipment_name: 'Event Start Photo Proof',`,
  `            lead_id: booking.leadId || null,
            order_id: booking.orderId || null,
            assignment_id: booking.assignmentId || null,
            equipment_name: 'Event Start',`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
