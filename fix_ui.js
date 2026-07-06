import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// 1. Update the wizard progress bar
content = content.replace(
  /                \{\[\n                  \{ step: 1, label: 'Customer' \},\n                  \{ step: 2, label: 'Event Info' \},\n                  \{ step: 3, label: 'Packages' \},\n                  \{ step: 4, label: 'Budget\/Notes' \},\n                  \{ step: 5, label: 'Finalize' \}\n                \]\.map\(\(item\) => \{/g,
  `                {[
                  { step: 1, label: 'Customer Info' },
                  { step: 2, label: 'Event Details' },
                  { step: 3, label: 'CRM & Quotation' }
                ].map((item) => {`
);

// 2. Remove the closing div of step 3, and remove the `{wizardStep === 4 && (`
// Wait, the `{wizardStep === 4 && (` is at `              {/* STEP 4: BUDGET & REMARKS */}`
content = content.replace(
  /                <\/div>\n              \)}\n\n              \{\/\* STEP 4: BUDGET & REMARKS \*\/\}\n              \{wizardStep === 4 && \(\n                <div className="bg-slate-950\/30 border border-slate-800\/60 rounded-xl p-4\.5 space-y-4 shadow-sm pb-6 animate-fade-in text-left">\n                  <div className="flex items-center gap-2 border-b border-slate-800\/50 pb-2 mb-1">\n                    <Edit className="w-4 h-4 text-cyan-410" \/>\n                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">4\. Proposed Budget & Remarks<\/span>\n                  <\/div>\n                  \{renderQuotationAndStep4Section\(false\)\}\n                <\/div>\n              \)}/g,
  `
                  <div className="mt-8 flex items-center gap-2 border-b border-slate-800/50 pb-2 mb-1">
                    <Edit className="w-4 h-4 text-cyan-410" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Proposed Budget & Remarks</span>
                  </div>
                  {renderQuotationAndStep4Section(false)}
`
);

// 3. Remove the `{wizardStep === 5 && (` and its closing div
// Wait, the step 5 contains "Summary Overview Panel" and "Stage Setup"
// Let's replace the `              {/* STEP 5: REVIEW & FINALIZE */}` part
content = content.replace(
  /              \{\/\* STEP 5: REVIEW & FINALIZE \*\/\}\n              \{wizardStep === 5 && \(\n                <div className="space-y-4 animate-fade-in text-left">/g,
  `
                  {/* REVIEW & FINALIZE (merged into step 3) */}
                  <div className="mt-8 space-y-4 animate-fade-in text-left">
`
);

// We need to make sure the closing `)}` for step 5 is removed or handled.
// The end of Step 5 has:
/*
                              isSel
                                 ? 'bg-slate-900 border-indigo-500 text-indigo-400 ring-1 ring-indigo-500/25 shadow-lg'
                                 : `bg-[#131b2e]/60 ${stage.style} opacity-70 hover:opacity-100 hover:bg-[#1b253f]`
                            }`}
                          >
                            {stage.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
*/
content = content.replace(
  /                            \}`} \n                          >\n                            \{stage\.label\}\n                          <\/button>\n                        \);\n                      \}\)\}\n                    <\/div>\n                  <\/div>\n                <\/div>\n              \)}\n/g,
  `                            }`} 
                          >
                            {stage.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
`
);
// Wait, replacing it with the same thing but with one less `)}`?
// The first div is for the step 5 wrapper: `<div className="space-y-4 animate-fade-in text-left">`
// The second div is for the step 3 wrapper: it was never closed because we removed the `</div>\n)}` before step 4!
// So step 3 now contains step 4's content and step 5's content.
// Therefore, we just need to keep `</div>\n)}` at the end to close the step 3 wrapper!

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated UI rendering");
