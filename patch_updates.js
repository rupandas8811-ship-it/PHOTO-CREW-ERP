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

// Also need to patch updateLead for edit flow where it might use wizardLeadData! Wait, let's check what updateLead uses in Step 4 wizard save
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched updates");
