const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const targetStr = `    // Detect highest completed step
    const localSavedStep = localStorage.getItem(\`crm_last_step_\${lead.lead_id}\`);
    let completedStep = 0;
    if (localSavedStep) {
      completedStep = parseInt(localSavedStep, 10);
    } else {`;

const replaceStr = `    // Detect highest completed step
    const localSavedStep = localStorage.getItem(\`crm_last_step_\${lead.lead_id}\`);
    let completedStep = 0;
    
    // Explicit override for New Lead status to strictly enforce step 2 routing
    const isNewLeadStatus = lead.status === 'New Lead' || lead.current_status === 'New Lead';

    if (isNewLeadStatus) {
      completedStep = 1; // Enforce step 1 completed for New Lead
    } else if (localSavedStep) {
      completedStep = parseInt(localSavedStep, 10);
    } else {`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/SalesModule.tsx', content.replace(targetStr, replaceStr));
  console.log("Patched successfully");
} else {
  console.log("Target string not found!");
}
