import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `    setSalesStaffName(lead.sales_staff_name || '');
    setSalesStaffMobile(lead.sales_staff_mobile || '');`;

const replaceStr = `    // Extract staff info from events if not directly on lead
    let evtStaffName = '';
    let evtStaffMobile = '';
    if (lead.events && lead.events.length > 0) {
      const evWithStaff = lead.events.find(e => e.assigned_staff_names);
      if (evWithStaff) {
        evtStaffName = evWithStaff.assigned_staff_names || '';
        evtStaffMobile = evWithStaff.assigned_staff_mobiles || '';
      }
    }
    setSalesStaffName(lead.sales_staff_name || evtStaffName || '');
    setSalesStaffMobile(lead.sales_staff_mobile || evtStaffMobile || '');`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched sales staff fields in handleSelectLead");
