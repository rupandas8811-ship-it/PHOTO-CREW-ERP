import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(/lead\.Next_Follow_up_Date/g, 'lead.next_follow_up_date');
content = content.replace(/lead\["Follow-up_Notes"\]/g, 'lead.follow_up_notes');

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched SalesModule.tsx table");
