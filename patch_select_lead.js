import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /next_follow_up_date: '',\n\s*\/\/ Step 5/g,
  'next_follow_up_date: lead.next_follow_up_date || \'\',\n      // Step 5'
);

content = content.replace(
  /setFollowUpForm\(\{\n\s*call_notes: '',\n\s*next_follow_up_date: '',/g,
  'setFollowUpForm({\n      call_notes: lead.follow_up_notes || \'\',\n      next_follow_up_date: lead.next_follow_up_date || \'\','
);

// We should also set internalNotes and followUpDate just in case
content = content.replace(
  /setWizardLeadData\(\{/g,
  'setInternalNotes(lead.follow_up_notes || \'\');\n    setFollowUpDate(lead.next_follow_up_date || \'\');\n    setWizardLeadData({'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched select lead");
