import fs from 'fs';
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

content = content.replace(
  /if \(callNotes\) updatesPayload\["Follow-up_Notes"\] = callNotes;\n\s*if \(nextFollowUpDate\) updatesPayload\["Next_Follow_up_Date"\] = nextFollowUpDate;/g,
  'updatesPayload.follow_up_notes = callNotes || null;\n    updatesPayload.next_follow_up_date = nextFollowUpDate || null;'
);

fs.writeFileSync('src/components/RoleContext.tsx', content, 'utf-8');
console.log("Patched RoleContext.tsx");
