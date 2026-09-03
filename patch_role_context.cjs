const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target = `      const slotPart = assignId.split('-').pop() || Math.floor(Math.random()*1000).toString();
      const dbStaffName = \`\${a.staff_name}__SLOT__\${slotPart}\`;`;

const replacement = `      const dbStaffName = \`\${a.staff_name}__SLOT__\${assignId}\`;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched RoleContext.tsx");
} else {
  console.log("Target not found");
}
