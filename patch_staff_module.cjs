const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `              order_id: booking.orderId || null,
              equipment_name: eqName,
              equipment_status: 'Asset Collected (Draft)',`,
  `              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: eqName,
              equipment_status: 'Asset Collected (Draft)',`
);

code = code.replace(
  `              order_id: booking.orderId || null,
              equipment_name: eqName,
              equipment_status: 'Equipment Received',`,
  `              order_id: booking.orderId || null,
              assignment_id: booking.assignmentId || null,
              equipment_name: eqName,
              equipment_status: 'Equipment Received',`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
