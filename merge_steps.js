import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(
  /                <\/div>\n              \)}\n              \{\/\* STEP 4: BUDGET & REMARKS \*\/\}\n              \{wizardStep === 4 && \(\n                <div className="bg-slate-950\/30 border border-slate-800\/60 rounded-xl p-4\.5 space-y-4 shadow-sm pb-6 animate-fade-in text-left">/g,
  `
                  <div className="mt-8 bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm pb-6 animate-fade-in text-left">`
);

content = content.replace(
  /                <\/div>\n              \)}\n              \{\/\* STEP 5: REVIEW & FINALIZE \*\/\}\n              \{wizardStep === 5 && \(\n                <div className="space-y-4 animate-fade-in text-left">/g,
  `
                  </div>
                  <div className="mt-8 space-y-4 animate-fade-in text-left">`
);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Merged Steps");
