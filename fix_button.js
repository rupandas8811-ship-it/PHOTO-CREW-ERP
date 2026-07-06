import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  'className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold rounded-lg border border-sky-500/30 transition-all uppercase"',
  'className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold rounded-lg border border-sky-500/30 transition-all uppercase w-full sm:w-auto"'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed button");
