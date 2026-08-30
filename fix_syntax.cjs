const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

code = code.replace(/onClick=\{.*?setActiveWorkflowProd\(prod\);\s*setWorkflowActionType\('([^']+)'\);\}/g, "onClick={() => { setActiveWorkflowProd(prod); setWorkflowActionType('$1'); }}");

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
