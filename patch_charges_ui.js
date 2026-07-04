import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetAdditionalInput = `              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Services Cost (₹)
              </label>
              <input
                type="number"
                value={quoteAdditional || ''}
                readOnly
                placeholder="0"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-400 font-mono opacity-80 cursor-not-allowed"
                title="Automatically calculated from services added in Step 4"
              />`;

const replaceAdditionalInput = `              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Additional Services Cost (₹)
              </label>
              <input
                type="number"
                value={quoteAdditional || ''}
                onChange={(e) => setQuoteAdditional(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />`;

content = content.replace(targetAdditionalInput, replaceAdditionalInput);

const targetExtraInput = `            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Extra Charges (₹)
              </label>
              <input
                type="number"
                value={quoteExtraCharges || ''}
                onChange={(e) => setQuoteExtraCharges(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-mono transition-all"
              />
            </div>`;

content = content.replace(targetExtraInput, '');

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched charges UI");
