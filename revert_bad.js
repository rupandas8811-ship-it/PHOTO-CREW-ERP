import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /setInternalNotes\(lead\.follow_up_notes \|\| ''\);\s*setFollowUpDate\(lead\.next_follow_up_date \|\| ''\);\s*setWizardLeadData\(\{/g,
  'setWizardLeadData({'
);

// Now apply the intended one
content = content.replace(
  /const evStaffPax = firstEvent\?\.staff_pax \?\? lead\.staff_pax \?\? '';\n\s*setWizardLeadData\(\{/g,
  'const evStaffPax = firstEvent?.staff_pax ?? lead.staff_pax ?? \'\';\n    setInternalNotes(lead.follow_up_notes || \'\');\n    setFollowUpDate(lead.next_follow_up_date || \'\');\n    setWizardLeadData({'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Reverted bad JSX replacements");
