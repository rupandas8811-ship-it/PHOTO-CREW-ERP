import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `      await updateLead(selectedLead.lead_id, {
        status: 'Lost Lead',
        remarks: \`Lost Reason: \${finalReason}. Notes: \${lostNotes}\`
      });

      await updateLeadFollowUp(
        selectedLead.lead_id,
        'Lost Lead',
        \`Lost Reason: \${finalReason}. Notes: \${lostNotes}\`,
        '',
        Number(selectedLead.package_price || selectedLead.budget || 0),
        \`Lost Reason: \${finalReason}. Notes: \${lostNotes}\`
      );`;

const replaceStr = `      await updateLead(selectedLead.lead_id, {
        status: 'Lost Lead',
        remarks: \`Lost Reason: \${finalReason}. Notes: \${lostNotes}\`,
        "Lost_Reason": finalReason,
        "Lost_Notes": lostNotes
      } as any);

      await updateLeadFollowUp(
        selectedLead.lead_id,
        'Lost Lead',
        finalReason,
        '',
        Number(selectedLead.package_price || selectedLead.budget || 0),
        lostNotes
      );`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched mark lost lead");
