import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// Merge step 4 into step 3
content = content.replace(
  `                  )}
                </div>
              )}

              {/* STEP 4: BUDGET & REMARKS */}
              {wizardStep === 4 && (
                <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm pb-6 animate-fade-in text-left">
                  <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <Edit className="w-4 h-4 text-cyan-410" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">4. Proposed Budget & Remarks</span>
                  </div>
                  {renderQuotationAndStep4Section(false)}
                </div>
              )}`,
  `                  )}
                  {/* STEP 4 INTEGRATED: BUDGET & REMARKS */}
                  <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-4.5 space-y-4 shadow-sm pb-6 animate-fade-in text-left mt-6">
                    <div className="flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                      <Edit className="w-4 h-4 text-cyan-410" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Proposed Budget & Remarks</span>
                    </div>
                    {renderQuotationAndStep4Section(false)}
                  </div>`
);

// Merge step 5 into step 3
content = content.replace(
  `              {/* STEP 5: REVIEW & FINALIZE */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-fade-in text-left">`,
  `              {/* STEP 5 INTEGRATED: REVIEW & FINALIZE */}
                  <div className="space-y-4 animate-fade-in text-left mt-6">`
);

content = content.replace(
  `                    )}
                  </div>
                </div>
              )}
            </div>`,
  `                    )}
                  </div>
                </div>
                </div>
              )}
            </div>`
);

// Fix the PDF and WA buttons so they don't do setWizardStep(4)
content = content.replace(
  `      if (!isEdit) {
        setWizardStep(4);
      } else {
        showToastMsg("Quotation successfully generated!", "success");
      }`,
  `      showToastMsg("Quotation successfully generated!", "success");`
);

content = content.replace(
  `      if (!isEdit) { 
        setWizardStep(4); 
      } else { 
        showToastMsg("Quotation downloaded and WhatsApp prepared!", "success"); 
      }`,
  `      showToastMsg("Quotation downloaded and WhatsApp prepared!", "success");`
);

// Remove "4" and "5" from the crmWizardStep 4 logic: Wait, we also need to change crmWizardStep!
// Let's do crmWizardStep next.

fs.writeFileSync('src/components/SalesModule.tsx', content);
console.log("Replaced create_lead_form steps");
