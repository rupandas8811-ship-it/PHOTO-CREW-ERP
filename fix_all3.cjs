const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// The original replacement string was:
const badManageStatus = "workflowActionType === 'manage_status'\n                  ? 'max-w-4xl w-full border border-zinc-900 rounded-2xl'";
const badAssignEditor = "workflowActionType === 'assign_editor'\n                ? 'w-full h-[100dvh] md:h-auto md:max-h-[96vh] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-[90%] lg:w-[85%] max-w-5xl'";

// Also check single-line variants:
const badManageStatus2 = "workflowActionType === 'manage_status'                  ? 'max-w-4xl w-full border border-zinc-900 rounded-2xl'";
const badAssignEditor2 = "workflowActionType === 'assign_editor'                ? 'w-full h-[100dvh] md:h-auto md:max-h-[96vh] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-[90%] lg:w-[85%] max-w-5xl'";

// Fix it everywhere
prod = prod.split(badManageStatus).join("workflowActionType === 'manage_status'");
prod = prod.split(badAssignEditor).join("workflowActionType === 'assign_editor'");
prod = prod.split(badManageStatus2).join("workflowActionType === 'manage_status'");
prod = prod.split(badAssignEditor2).join("workflowActionType === 'assign_editor'");

// Now properly re-apply to just the modal
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
console.log("Fixed globally");
