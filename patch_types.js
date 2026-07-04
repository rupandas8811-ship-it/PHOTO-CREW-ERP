import fs from 'fs';
let content = fs.readFileSync('src/types.ts', 'utf-8');

content = content.replace(/"Follow-up_Notes"\?: string;/g, 'follow_up_notes?: string;');
content = content.replace(/Next_Follow_up_Date\?: string;/g, 'next_follow_up_date?: string;');

fs.writeFileSync('src/types.ts', content, 'utf-8');
console.log("Patched types");
