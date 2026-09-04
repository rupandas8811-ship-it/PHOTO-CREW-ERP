const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `      const kitMapping = allAssignedStaff.map(st => ({
        event_id: st.event_id,
        staff_name: st.staff_name,
        staff_role: st.staff_role,
        equipment: st.equipment || []
      }));`,
  `      const kitMapping = allAssignedStaff.map(st => ({
        event_id: st.event_id,
        assignment_id: st.assignment_id,
        staff_name: st.staff_name,
        staff_role: st.staff_role,
        equipment: st.equipment || []
      }));`
);
fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
