import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// The createForm payload
content = content.replace(
  /remarks: getRemarksPayload\(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address\),/g,
  'remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city, createForm.client_residence_address),\n            next_follow_up_date: followUpDate || null,\n            follow_up_notes: internalNotes || null,'
);

// The getRemarksPayload without client_residence_address (there is one at line 2916)
content = content.replace(
  /remarks: getRemarksPayload\(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city\),/g,
  'remarks: getRemarksPayload(createForm.remarks, internalNotes, followUpDate, createForm.whatsapp_number, createForm.address, createForm.city),\n          next_follow_up_date: followUpDate || null,\n          follow_up_notes: internalNotes || null,'
);

// Replace properties mapped to old Follow up Notes strings
content = content.replace(/lead\.Next_Follow_up_Date/g, 'lead.next_follow_up_date');
content = content.replace(/lead\["Follow-up_Notes"\]/g, 'lead.follow_up_notes');

// Update next_follow_up_date in handleSelectLead
content = content.replace(
  /next_follow_up_date: '',\n\s*\/\/ Step 5/g,
  'next_follow_up_date: lead.next_follow_up_date || \'\',\n      // Step 5'
);

// Update follow_up_notes in setFollowUpForm
content = content.replace(
  /setFollowUpForm\(\{\n\s*call_notes: '',\n\s*next_follow_up_date: '',/g,
  'setFollowUpForm({\n      call_notes: lead.follow_up_notes || \'\',\n      next_follow_up_date: lead.next_follow_up_date || \'\','
);

// Correctly map internalNotes and followUpDate ONLY when initializing wizardLeadData in handleSelectLead
content = content.replace(
  /const evStaffPax = firstEvent\?\.staff_pax \?\? lead\.staff_pax \?\? '';\n\s*setWizardLeadData\(\{/g,
  'const evStaffPax = firstEvent?.staff_pax ?? lead.staff_pax ?? \'\';\n    setInternalNotes(lead.follow_up_notes || \'\');\n    setFollowUpDate(lead.next_follow_up_date || \'\');\n    setWizardLeadData({'
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed sales module");
