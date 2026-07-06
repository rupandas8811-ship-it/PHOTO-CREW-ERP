import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// Replace crmWizardStep === 5
content = content.replace(
  `                  {crmWizardStep === 5 && (
                    <div className="space-y-4 animate-fade-in text-left">
                      <div className="border-b border-slate-800 pb-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">4</span>
                          <span>Status Update</span>`,
  `                  {/* STEP 5 INTEGRATED (CRM): Status Update */}\n                  <div className="space-y-4 animate-fade-in text-left mt-6">
                      <div className="border-b border-slate-800 pb-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span className="p-0.5 px-1.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-mono">4</span>
                          <span>Status Update</span>`
);

content = content.replace(
  `                        </div>
                      </div>
                    </div>
                  )}

                  {/* CRM FOOTER */}`,
  `                        </div>
                      </div>
                    </div>

                  {/* CRM FOOTER */}`
);

// We need to change the references to crmWizardStep === 4 back to 3 if they meant 3 or 4.
content = content.replace(/wizardStep === 4 \|\| crmWizardStep === 4/g, 'wizardStep === 3 || crmWizardStep === 3');
content = content.replace(/crmWizardStep === 4 \?/g, 'crmWizardStep === 3 ?');
content = content.replace(/getSelectedPkgsInfo\(crmWizardStep === 4\)/g, 'getSelectedPkgsInfo(crmWizardStep === 3)');

fs.writeFileSync('src/components/SalesModule.tsx', content);
console.log("Replaced crmWizardStep steps");
