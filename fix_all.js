import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// Fix 1597 initial state
content = content.replace(/next_follow_up_date: lead\.next_follow_up_date \|\| '',/g, 'next_follow_up_date: \'\',');

// Fix duplicate keys in objects
content = content.replace(/(\n\s*next_follow_up_date: followUpDate \|\| null,\n\s*follow_up_notes: internalNotes \|\| null,)+/g, '\n            next_follow_up_date: followUpDate || null,\n            follow_up_notes: internalNotes || null,');

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed typescript errors");
