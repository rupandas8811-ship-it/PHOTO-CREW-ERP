const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
code = code.replace(/\\nimport { ProductionWorkflowModal }/g, "\nimport { ProductionWorkflowModal }");
fs.writeFileSync('src/components/ProductionModule.tsx', code);
