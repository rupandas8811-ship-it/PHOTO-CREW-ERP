const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

code = code.replace(/handleOpenAssignEditor=\{handleOpenAssignEditor\}/, 'setWorkflowActionType={setWorkflowActionType}\n          setActiveWorkflowProd={setActiveWorkflowProd}');

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
