const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const oldFunc = `    const sa = staffAssignments?.find(s => s.order_id === orderId && s.staff_name?.toLowerCase() === nameLower);
    if (sa && sa.assignment_status && !['Assigned', 'Unassigned'].includes(sa.assignment_status)) {
      return sa.assignment_status;
    }

    const op = getOpDetails(orderId);
    if (op?.event_status && !['Assigned', 'Event Scheduled', 'Operations Assigned'].includes(op.event_status)) {
      return op.event_status;
    }

    return 'Pending';
  };`;

const newFunc = `    const sa = staffAssignments?.find(s => s.order_id === orderId && s.staff_name?.toLowerCase() === nameLower);
    if (sa && sa.task_status && !['Assigned', 'Unassigned'].includes(sa.task_status)) {
      return sa.task_status;
    }
    if (sa && sa.assignment_status && !['Assigned', 'Unassigned'].includes(sa.assignment_status)) {
      return sa.assignment_status;
    }

    return 'Pending';
  };`;

if (code.includes(oldFunc)) {
  code = code.replace(oldFunc, newFunc);
  fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
  console.log("Fixed getStaffTaskStatus!");
} else {
  console.log("Could not find oldFunc");
}
