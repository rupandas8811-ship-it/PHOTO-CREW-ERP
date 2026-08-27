const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Also there might be stray lines around 8100 due to:
// {workflowActionType === 'manage_status' ? 'max-w-4xl w-full border border-zinc-900 rounded-2xl' && 'CRM Status Management'}
// from the previous failed checkout/sed
prod = prod.replace(/\{workflowActionType === 'assign_editor'.*&& 'Assign Editor'\}/g, "{workflowActionType === 'assign_editor' && 'Assign Editor'}");
prod = prod.replace(/\{workflowActionType === 'manage_status'.*&& 'CRM Status Management'\}/g, "{workflowActionType === 'manage_status' && 'CRM Status Management'}");
fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');
