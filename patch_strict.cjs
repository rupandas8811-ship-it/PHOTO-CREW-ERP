const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `                                    if (member.assignment_id) {
                                      if (hAssignmentId && member.assignment_id !== hAssignmentId) return false;
                                      if (!hAssignmentId) {
                                        // If no hAssignmentId, at least strictly match the event ID
                                        const hEventId = parsed.event_id || h.event_id;
                                        if (memberEvId && memberEvId !== 'gen' && hEventId && hEventId !== 'gen' && hEventId !== memberEvId) return false;
                                      }
                                    }`,
  `                                    if (member.assignment_id) {
                                      if (hAssignmentId && member.assignment_id !== hAssignmentId) return false;
                                      if (!hAssignmentId) {
                                        const hEventId = parsed.event_id || h.event_id;
                                        if (memberEvId && memberEvId !== 'gen' && hEventId && hEventId !== 'gen' && hEventId !== memberEvId) return false;
                                        if (!hEventId && memberEvId) return false; // Must have matching event if strict
                                        const hRole = parsed.staff_role || h.staff_role;
                                        if (hRole && member.staff_role && hRole.trim().toLowerCase() !== member.staff_role.trim().toLowerCase()) return false;
                                      }
                                    }`
);
fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
