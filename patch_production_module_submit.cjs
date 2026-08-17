const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Replace updateStaff with updateProductionStaff and addStaff with addProductionStaff
const target = `    try {
      if (editingStaffMember) {
        const { mobile: _m, email: _e, ...safePayload } = payload;
        await updateStaff(editingStaffMember.staff_id, safePayload);
      } else {
        await addStaff(payload);
      }`;

const replacement = `    try {
      if (editingStaffMember) {
        const { mobile: _m, email: _e, ...safePayload } = payload;
        await updateProductionStaff(editingStaffMember.staff_id, safePayload);
      } else {
        await addProductionStaff(payload);
      }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ProductionModule.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Target string not found");
}
