const fs = require('fs');

// Patch ProductionModule.tsx
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

prod = prod.replace(/workflowActionType === 'assign_editor'\s*\?\s*"w-full h-\[100dvh\] md:h-auto md:max-h-\[96vh\] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-\[90%\] lg:w-\[85%\] max-w-5xl"/g, "workflowActionType === 'assign_editor'");
prod = prod.replace(/workflowActionType === 'manage_status'\s*\?\s*"max-w-4xl w-full border border-zinc-900 rounded-2xl"/g, "workflowActionType === 'manage_status'");

// Replace stray broken conditionals
prod = prod.replace(/\{workflowActionType === 'assign_editor'.*&& 'Assign Editor'\}/g, "{workflowActionType === 'assign_editor' && 'Assign Editor'}");
prod = prod.replace(/\{workflowActionType === 'manage_status'.*&& 'CRM Status Management'\}/g, "{workflowActionType === 'manage_status' && 'CRM Status Management'}");

const oldClasses = 'className={`fixed inset-0 z-[100] flex items-center justify-center ${workflowActionType === "assign_editor" ? "p-0 md:p-4" : "p-4"} bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden`}'
prod = prod.replace(
  oldClasses,
  'className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"'
);

prod = prod.replace(
  'className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"',
  oldClasses
);

const regex = /<div id="production_workflow_modal" className=\{\`bg-zinc-950 ([\s\S]*?) overflow-hidden\`\}>/g;
prod = prod.replace(regex, (match, inner) => {
  return `<div id="production_workflow_modal" className={\`bg-zinc-950 flex flex-col shadow-2xl transition-all duration-300 \${
              workflowActionType === 'assign_editor'
                ? 'w-full h-[100dvh] md:h-auto md:max-h-[96vh] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-[90%] lg:w-[85%] max-w-5xl'
                : workflowActionType === 'manage_status'
                  ? 'max-w-4xl w-full border border-zinc-900 rounded-2xl'
                  : 'max-w-sm w-full border border-zinc-900 rounded-2xl'
            } overflow-hidden\`}>`;
});

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');

// Patch OperationsLeads.tsx
let ops = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

ops = ops.replace(
  'p-0 sm:p-4 md:p-6',
  'p-0 md:p-4'
);

ops = ops.replace(
  'id="assign_staff_modal" className="bg-zinc-900 border-x-0 border-y-0 sm:border border-zinc-800 rounded-none sm:rounded-3xl w-full h-[100dvh] sm:h-[96vh] sm:max-h-[96vh] max-w-full sm:max-w-[96vw] xl:max-w-[98vw] flex flex-col shadow-2xl relative my-auto animate-in zoom-in duration-200 overflow-hidden"',
  'id="assign_staff_modal" className="bg-zinc-900 border-0 md:border border-zinc-800 rounded-none md:rounded-3xl w-full h-[100dvh] md:h-auto md:max-h-[96vh] max-w-full md:max-w-[96vw] xl:max-w-[98vw] flex flex-col shadow-2xl relative my-auto animate-in zoom-in duration-200 overflow-hidden"'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', ops, 'utf8');
console.log("Fixed all 2");
