import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(/sales_staff_name: salesStaffName,\n\s*sales_staff_mobile: salesStaffMobile,/g, '');

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched Step 2 again");
