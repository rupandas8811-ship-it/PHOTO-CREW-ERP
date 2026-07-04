import fs from 'fs';
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const targetStr = `              .map((e: any) => ({
                ...e,
                event_start_date: e.event_start_time || e.event_date || '',
                event_end_date: e.event_end_time || e.event_date || '',
                event_start_time: e.event_start_time || '',
                event_end_time: e.event_end_time || ''
              }));`;

const replaceStr = `              .map((e: any) => ({
                ...e,
                event_start_date: e.event_start_date || e.event_date || '',
                event_end_date: e.event_end_date || e.event_date || '',
                event_start_time: e.event_start_time || '',
                event_end_time: e.event_end_time || ''
              }));`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/RoleContext.tsx', content, 'utf-8');
console.log("Patched RoleContext.tsx event times");
