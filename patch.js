const fs = require('fs');
const content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');
const search = '<div className="sticky bottom-0 z-50 p-4 border-t border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 bg-zinc-950/90 backdrop-blur-md">';
const replace = `{assignValidationError && (
                 <div className="p-4 mx-6 my-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <span className="text-red-400 font-bold text-lg leading-none mt-0.5">❌</span>
                    <div className="text-[13px] text-red-200 font-sans whitespace-pre-wrap flex-1 leading-relaxed">
                       {assignValidationError}
                    </div>
                 </div>
              )}\n                            ` + search;
fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content.replace(search, replace));
