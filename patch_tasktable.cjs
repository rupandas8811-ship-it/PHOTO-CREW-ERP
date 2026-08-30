const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

// Add props
code = code.replace(/handleOpenAssignEditor = \(\) => \{\},/, 'setWorkflowActionType = (type: string | null) => {},\n  setActiveWorkflowProd = (prod: any | null) => {},');

// Replace handleOpenAssignEditor usages with setActiveWorkflowProd(prod); setWorkflowActionType('assign_editor');
code = code.replace(/handleOpenAssignEditor\(prod\)/g, "setActiveWorkflowProd(prod); setWorkflowActionType('assign_editor');");

// What about handleOpenClientAcceptance?
code = code.replace(/handleOpenClientAcceptance\(prod\)/g, "setActiveWorkflowProd(prod); setWorkflowActionType('close_project');");

// What about handleOpenManageStatus?
code = code.replace(/handleOpenManageStatus\(prod\)/g, "setActiveWorkflowProd(prod); setWorkflowActionType('manage_status');");

// What about handleOpenResendReviewPopup?
code = code.replace(/handleOpenResendReviewPopup\(prod\)/g, "setActiveWorkflowProd(prod); setWorkflowActionType('send_review');");

// Update any other action buttons that I might have missed!

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
