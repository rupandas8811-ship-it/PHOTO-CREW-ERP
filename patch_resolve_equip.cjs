const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `            const taskMatch = parsedKits.find((k: any) => 
               (k.staff_name || '').toLowerCase() === normName &&
               (ev && k.event_id === ev.id)
            );`,
  `            const taskMatch = parsedKits.find((k: any) => {
               if ((k.staff_name || '').toLowerCase() !== normName) return false;
               if (ev && k.event_id && k.event_id !== ev.id) return false;
               if (saMatch?.assignment_id && k.assignment_id && saMatch.assignment_id !== k.assignment_id) return false;
               if (!saMatch?.assignment_id && saMatch?.staff_role && k.staff_role && saMatch.staff_role !== k.staff_role) return false;
               return true;
            });`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
