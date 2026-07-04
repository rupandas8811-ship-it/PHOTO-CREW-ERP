import fs from 'fs';
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const targetStr = `    const res = await pushUpdate('leads', 'lead_id', leadId, {
      status: normalizedStatus,
      current_status: normalizedStatus,
      budget: quotationAmount !== undefined ? quotationAmount : targetLead?.budget,
      remarks: \`\${targetLead?.remarks || ''}\\n[Update \${timestamp.split('T')[0]}]: \${callNotes}. \${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: \${nextFollowUpDate}\`,
      updated_by: currentUserName,
      updated_at: timestamp
    });`;

const replaceStr = `    const updatesPayload: any = {
      status: normalizedStatus,
      current_status: normalizedStatus,
      budget: quotationAmount !== undefined ? quotationAmount : targetLead?.budget,
      remarks: \`\${targetLead?.remarks || ''}\\n[Update \${timestamp.split('T')[0]}]: \${callNotes}. \${negotiationNotes ? 'Neg Notes: ' + negotiationNotes : ''}. Next follow-up: \${nextFollowUpDate}\`,
      updated_by: currentUserName,
      updated_at: timestamp
    };
    
    if (callNotes) updatesPayload["Follow-up_Notes"] = callNotes;
    if (nextFollowUpDate) updatesPayload["Next_Follow_up_Date"] = nextFollowUpDate;
    
    if (normalizedStatus === 'Lost Lead') {
      updatesPayload["Lost_Reason"] = callNotes; // Lost Reason is usually passed via callNotes or negotiationNotes
      updatesPayload["Lost_Notes"] = negotiationNotes || callNotes;
    }

    const res = await pushUpdate('leads', 'lead_id', leadId, updatesPayload);`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/RoleContext.tsx', content, 'utf-8');
console.log("Patched RoleContext lead followup");
