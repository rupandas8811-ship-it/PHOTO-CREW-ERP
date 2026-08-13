const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

const oldCode = `    const activeAssignments = staffAssignments ? staffAssignments.filter(sa => 
      sa.staff_name.toLowerCase() === staffName.toLowerCase() && 
      sa.assignment_status !== 'Cancelled'
    ) : [];`;

const newCode = `    const activeAssignments = staffAssignments ? staffAssignments.filter(sa => {
      if (sa.staff_name.toLowerCase() !== staffName.toLowerCase()) return false;
      const assignmentStatus = (sa.assignment_status || '').toLowerCase();
      const taskStatus = ((sa as any).task_status || '').toLowerCase();
      
      const completedStatuses = [
        'cancelled', 'canceled', 'completed', 'event completed', 
        'project completed', 'closed', 'order closed', 'project closed', 'delivered'
      ];
      
      if (completedStatuses.includes(assignmentStatus) || completedStatuses.includes(taskStatus)) {
        return false;
      }
      return true;
    }) : [];`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
  console.log('Patched OperationsLeads.tsx');
} else {
  console.log('Could not find oldCode in OperationsLeads.tsx');
}
