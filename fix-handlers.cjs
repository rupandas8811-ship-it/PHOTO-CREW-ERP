const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

code = code.replace(/onClick=\{\(\) => handleOpenAssignEditor\(prod\)\}/g, "onClick={() => { setActiveWorkflowProd(prod); setWorkflowActionType('assign_editor'); }}");
code = code.replace(/handleOpenAssignEditor\(prod\);/g, "setActiveWorkflowProd(prod); setWorkflowActionType('assign_editor');");

// Also add import for ProductionWorkflowModal
if (!code.includes("import { ProductionWorkflowModal }")) {
    code = code.replace("import { AddNoteModal } from './AddNoteModal';", "import { AddNoteModal } from './AddNoteModal';\\nimport { ProductionWorkflowModal } from './production/ProductionWorkflowModal';");
}

fs.writeFileSync('src/components/ProductionModule.tsx', code);
