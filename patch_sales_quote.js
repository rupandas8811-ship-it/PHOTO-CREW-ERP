import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `      setSalesStaffName(latestQuote.sales_staff_name || lead.sales_staff_name || '');
      setSalesStaffMobile(latestQuote.sales_staff_mobile || lead.sales_staff_mobile || '');`;

const replaceStr = `      setSalesStaffName(latestQuote.sales_staff_name || lead.sales_staff_name || evtStaffName || '');
      setSalesStaffMobile(latestQuote.sales_staff_mobile || lead.sales_staff_mobile || evtStaffMobile || '');`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched latest quote sales staff");
