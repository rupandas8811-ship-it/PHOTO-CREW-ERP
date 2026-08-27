const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// The original corrupt script ran sed which broke things. We need to fix the exact lines manually.
prod = prod.replace(/workflowActionType === 'assign_editor'\s*\?\s*"w-full h-\[100dvh\] md:h-auto md:max-h-\[96vh\] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-\[90%\] lg:w-\[85%\] max-w-5xl"/g, "workflowActionType === 'assign_editor'");
prod = prod.replace(/workflowActionType === 'manage_status'\s*\?\s*"max-w-4xl w-full border border-zinc-900 rounded-2xl"/g, "workflowActionType === 'manage_status'");

// Replace stray broken conditionals
prod = prod.replace(/\{workflowActionType === 'assign_editor'.*&& 'Assign Editor'\}/g, "{workflowActionType === 'assign_editor' && 'Assign Editor'}");
prod = prod.replace(/\{workflowActionType === 'manage_status'.*&& 'CRM Status Management'\}/g, "{workflowActionType === 'manage_status' && 'CRM Status Management'}");

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');
