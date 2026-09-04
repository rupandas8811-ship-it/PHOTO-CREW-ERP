const fs = require('fs');
let code = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

// 1. Fix staffKey to include assignmentId so local state is isolated!
code = code.replace(
  `const staffKey = \`\${booking.orderId}_\${booking.eventId || 'ev'}_\${staffName.trim().toLowerCase()}\`;`,
  `const staffKey = \`\${booking.orderId}_\${booking.eventId || 'ev'}_\${booking.assignmentId || 'no_asst'}_\${staffName.trim().toLowerCase()}\`;`
);
code = code.replace(
  `const genKey = \`\${booking.orderId}_gen_\${staffName.trim().toLowerCase()}\`;`,
  `const genKey = \`\${booking.orderId}_gen_\${booking.assignmentId || 'no_asst'}_\${staffName.trim().toLowerCase()}\`;`
);

// 2. Fix openPhotoModal to STRICTLY match assignmentId!
code = code.replace(
  `      // 4. Strict assignment matching if present
      if (parsed.assignment_id && booking.assignmentId && parsed.assignment_id !== booking.assignmentId) {
        return false;
      }`,
  `      // 4. Strict assignment matching if present
      const hAssignmentId = h.assignment_id || parsed.assignment_id;
      if (booking.assignmentId && hAssignmentId && hAssignmentId !== booking.assignmentId) {
        return false;
      }`
);

fs.writeFileSync('src/components/StaffModule.tsx', code);
