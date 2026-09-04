const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `              return Boolean(p.raw_footage_link);`,
  `              if (!p.raw_footage_link) return false;
              // Add strict check for event name if there's no assignment_id
              if (!hAssignmentId && p.event_name && (sa as any)?.event_name && p.event_name.trim().toLowerCase() !== (sa as any).event_name.trim().toLowerCase()) return false;
              return true;`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
