const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target = `.select('assignment_id, staff_id, staff_role, event_id, event_name, assignment_date, assignment_status, task_status, equipment, mobile, staff_type')`;
const replacement = `.select('assignment_id, staff_id, staff_name, staff_role, event_id, event_name, assignment_date, assignment_status, task_status, equipment, mobile, staff_type')`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched select");
} else {
  console.log("Target not found");
}
