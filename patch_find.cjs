const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `                if (p.assignment_id && assignmentId && p.assignment_id !== assignmentId) return false;
                if (p.assignment_id && !assignmentId) return false;
                
                if (assignmentId && !p.assignment_id) {`,
  `                const hAssignmentId = h.assignment_id || p.assignment_id;
                if (hAssignmentId && assignmentId && hAssignmentId !== assignmentId) return false;
                if (hAssignmentId && !assignmentId) return false;
                
                if (assignmentId && !hAssignmentId) {`
);

code = code.replace(
  `              if (p.assignment_id && assignmentId && p.assignment_id !== assignmentId) return false;
              if (p.assignment_id && !assignmentId) return false;
              
              if (assignmentId && !p.assignment_id) {`,
  `              const hAssignmentId = h.assignment_id || p.assignment_id;
              if (hAssignmentId && assignmentId && hAssignmentId !== assignmentId) return false;
              if (hAssignmentId && !assignmentId) return false;
              
              if (assignmentId && !hAssignmentId) {`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
