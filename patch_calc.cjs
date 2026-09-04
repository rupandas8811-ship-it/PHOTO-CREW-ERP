const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

code = code.replace(
  `    // Strict Task Isolation Matching
    if (parsed.assignment_id && b.assignmentId && parsed.assignment_id !== b.assignmentId) {
      return;
    }
    // If the record has an assignment ID, but the current booking does not, it belongs to another specific assignment.
    if (parsed.assignment_id && !b.assignmentId) {
      return;
    }`,
  `    // Strict Task Isolation Matching
    const hAssignmentId = h.assignment_id || parsed.assignment_id;
    if (hAssignmentId && b.assignmentId && hAssignmentId !== b.assignmentId) {
      return;
    }
    // If the record has an assignment ID, but the current booking does not, it belongs to another specific assignment.
    if (hAssignmentId && !b.assignmentId) {
      return;
    }`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
