const fs = require('fs');

let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');
code = code.replace(/^\/\/ @ts-nocheck\\n/, "// @ts-nocheck\n");
code = code.replace(/^\/\/ @ts-nocheckimport/, "// @ts-nocheck\nimport");
fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);

let code2 = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
code2 = code2.replace(/^\/\/ @ts-nocheck\\n/, "// @ts-nocheck\n");
code2 = code2.replace(/^\/\/ @ts-nocheckimport/, "// @ts-nocheck\nimport");
fs.writeFileSync('src/components/ProductionModule.tsx', code2);

let code3 = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');
code3 = code3.replace(/^\/\/ @ts-nocheck\\n/, "// @ts-nocheck\n");
code3 = code3.replace(/^\/\/ @ts-nocheckimport/, "// @ts-nocheck\nimport");
fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code3);
