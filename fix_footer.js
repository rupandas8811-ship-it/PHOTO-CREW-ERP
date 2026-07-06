import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  '<div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950/40">',
  '<div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 bg-zinc-950/40">'
);

content = content.replace(
  '<button\n                  type="button"\n                  onClick={() => setAssigningOrderId(null)}\n                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"\n                >',
  '<button\n                  type="button"\n                  onClick={() => setAssigningOrderId(null)}\n                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer w-full sm:w-auto"\n                >'
);

content = content.replace(
  '<button\n                  type="submit"\n                  disabled={isSaving}\n                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"\n                >',
  '<button\n                  type="submit"\n                  disabled={isSaving}\n                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"\n                >'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed modal footer");
