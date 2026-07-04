import fs from 'fs';
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

content = content.replace(/event_start_time: ev\.event_start_time \|\| ev\.event_start_date \|\| '',/g, "event_start_time: ev.event_start_time || '',");
content = content.replace(/event_end_time: ev\.event_end_time \|\| ev\.event_end_date \|\| '',/g, "event_end_time: ev.event_end_time || '',");

fs.writeFileSync('src/components/RoleContext.tsx', content, 'utf-8');
console.log("Patched times");
