const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target = `    // Preserve any existing assignments for this order that were not part of this edit batch
    for (const ed of existingDbAssignments) {
      if (!matchedDbAssignmentIds.has(ed.assignment_id) && !finalReactAssignments.some(r => r.assignment_id === ed.assignment_id)) {
        finalReactAssignments.push(ed);
      }
    }`;

const replacement = `    // Preserve any existing assignments for this order that were not part of this edit batch
    for (const ed of existingDbAssignments) {
      if (!matchedDbAssignmentIds.has(ed.assignment_id) && !finalReactAssignments.some(r => r.assignment_id === ed.assignment_id)) {
        const copy = { ...ed };
        if (copy.staff_name && copy.staff_name.includes('__SLOT__')) {
          copy.staff_name = copy.staff_name.split('__SLOT__')[0];
        }
        finalReactAssignments.push(copy);
      }
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched preserve logic");
} else {
  console.log("Target not found");
}
