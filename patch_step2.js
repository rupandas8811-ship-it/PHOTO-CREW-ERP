import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `      const finalEventsList = (isCreateFlow ? [...createEvents] : [...crmEvents]).map(ev => ({
        ...ev,
        assigned_staff_names: salesStaffName || '',
        assigned_staff_mobiles: salesStaffMobile || ''
      }));`;

const replaceStr = `      const finalEventsList = (isCreateFlow ? [...createEvents] : [...crmEvents]);`;

content = content.replace(targetStr, replaceStr);

const targetStr2 = `        sales_staff_name: salesStaffName,
        sales_staff_mobile: salesStaffMobile,`;

const replaceStr2 = ``;

content = content.replace(targetStr2, replaceStr2);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched Step 2");
