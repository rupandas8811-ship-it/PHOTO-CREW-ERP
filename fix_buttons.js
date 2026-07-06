import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

content = content.replace(
  '<div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">',
  '<div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-zinc-800">'
);

content = content.replace(
  '<button\n                  type="button"\n                  onClick={() => setReceivingFootageOrderId(null)}\n                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer hover:bg-zinc-700 transition"\n                >',
  '<button\n                  type="button"\n                  onClick={() => setReceivingFootageOrderId(null)}\n                  className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs rounded-xl cursor-pointer hover:bg-zinc-700 transition w-full sm:w-auto"\n                >'
);

content = content.replace(
  '<button\n                  type="submit"\n                  disabled={isSaving}\n                  className="px-4 py-2 bg-purple-650 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"\n                >',
  '<button\n                  type="submit"\n                  disabled={isSaving}\n                  className="px-4 py-2 bg-purple-650 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl cursor-pointer flex justify-center items-center gap-1.5 w-full sm:w-auto"\n                >'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Fixed buttons");
