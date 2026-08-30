const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');
code = code.replace(/\\n\/\/ WORKFLOW HANDLERS/g, "\n// WORKFLOW HANDLERS");
fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);
