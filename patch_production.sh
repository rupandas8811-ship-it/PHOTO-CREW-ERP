#!/bin/bash
sed -i 's/className="fixed inset-0 z-\[100\] flex items-center justify-center p-4 bg-black\/80 backdrop-blur-md animate-fade-in"/className={`fixed inset-0 z-[100] flex items-center justify-center ${workflowActionType === '\''assign_editor'\'' ? '\''p-0 md:p-4'\'' : '\''p-4'\''} bg-black\/80 backdrop-blur-md animate-fade-in overflow-hidden`}/' src/components/ProductionModule.tsx

sed -i 's/className={`bg-zinc-950 border border-zinc-900 rounded-2xl ${/className={`bg-zinc-950 flex flex-col shadow-2xl transition-all duration-300 ${/' src/components/ProductionModule.tsx

sed -i 's/workflowActionType === '\''assign_editor'\''/workflowActionType === '\''assign_editor'\''\n                ? '\''w-full h-[100dvh] md:h-auto md:max-h-[96vh] rounded-none md:rounded-2xl border-0 md:border border-zinc-900 md:w-[90%] lg:w-[85%] max-w-5xl'\''/' src/components/ProductionModule.tsx

sed -i 's/? '\''w-full md:w-\[90%\] lg:w-\[85%\] max-w-5xl'\''//' src/components/ProductionModule.tsx

sed -i 's/workflowActionType === '\''manage_status'\''/workflowActionType === '\''manage_status'\''\n                  ? '\''max-w-4xl w-full border border-zinc-900 rounded-2xl'\''/' src/components/ProductionModule.tsx
sed -i 's/? '\''max-w-4xl w-full'\''//' src/components/ProductionModule.tsx

sed -i 's/: '\''max-w-sm w-full'\''/: '\''max-w-sm w-full border border-zinc-900 rounded-2xl'\''/' src/components/ProductionModule.tsx

sed -i 's/} overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}/} overflow-hidden`}/' src/components/ProductionModule.tsx

