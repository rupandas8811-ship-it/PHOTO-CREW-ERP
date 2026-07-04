import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = `            {/* If locked, display banner */}`;

const replaceStr = `            {/* If Lost Lead, display Lost Details */}
            {selectedLead && selectedLead.status === 'Lost Lead' && (
              <div className="mx-4 sm:mx-5 mt-2 bg-rose-950/25 border border-rose-500/20 p-2.5 rounded-xl flex items-start gap-3 text-left shadow-lg">
                <span className="text-rose-500 text-base mt-0.5">❌</span>
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wide">Lost Lead Information</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                    <strong>Reason:</strong> {selectedLead.Lost_Reason || 'N/A'} <br />
                    <strong>Notes:</strong> {selectedLead.Lost_Notes || 'N/A'}
                  </p>
                </div>
              </div>
            )}

            {/* If locked, display banner */}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched lost lead details");
