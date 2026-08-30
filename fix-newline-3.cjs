const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');
code = code.replace(/\/\/ @ts-nocheck\\n/g, "// @ts-nocheck\n");
fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);

let code2 = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
code2 = code2.replace(/\/\/ @ts-nocheck\\n/g, "// @ts-nocheck\n");
fs.writeFileSync('src/components/ProductionModule.tsx', code2);
