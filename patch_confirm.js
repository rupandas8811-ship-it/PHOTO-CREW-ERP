import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

// 1. Add states and executeWithReportingPopup
const stateInsert = `
  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);
  
  // Interception Popup for Reporting Date & Time
  const [showReportingPopup, setShowReportingPopup] = useState(false);
  const [reportingPopupData, setReportingPopupData] = useState({ date: '', time: '' });
  const [pendingConfirmAction, setPendingConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [isReportingSaving, setIsReportingSaving] = useState(false);

  const executeWithReportingPopup = (action: () => Promise<void>) => {
    const targetLeadId = selectedLead?.lead_id || createdLeadId;
    const targetLead = leads.find(l => l.lead_id === targetLeadId);
    setReportingPopupData({
      date: targetLead?.Reporting_date || '',
      time: targetLead?.reporting_time || ''
    });
    setPendingConfirmAction(() => action);
    setShowReportingPopup(true);
  };

  const [isSaving, setIsSaving] = useState(false);
`;
content = content.replace(
  '  const [statusError, setStatusError] = useState<{ title: string; reason: string; suggestedFix: string } | null>(null);\n  const [isSaving, setIsSaving] = useState(false);',
  stateInsert
);

// 2. handleOrderConfirmedSubmit wrap
const h1Search = `    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    try {`;
const h1Replace = `    if (advanceReceived === undefined || isNaN(advanceReceived)) {
      alert("Please enter Advance Paid Amount.");
      return;
    }

    executeWithReportingPopup(async () => {
      try {`;
content = content.replace(h1Search, h1Replace);

// End of handleOrderConfirmedSubmit
const h1EndSearch = `    } finally {
      setIsSaving(false);
    }
  };

  // Handle follow up submit`;
const h1EndReplace = `    } finally {
      setIsSaving(false);
    }
    });
  };

  // Handle follow up submit`;
content = content.replace(h1EndSearch, h1EndReplace);

// 3. handleFollowUpSubmit wrap
const h2Search = `      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received)) {
        alert("Please enter Advance Received.");
        return;
      }

      try {`;
const h2Replace = `      if (followUpForm.advance_received === undefined || isNaN(followUpForm.advance_received)) {
        alert("Please enter Advance Received.");
        return;
      }

      executeWithReportingPopup(async () => {
        try {`;
content = content.replace(h2Search, h2Replace);

// End of handleFollowUpSubmit
const h2EndSearch = `        } finally {
        setIsSaving(false);
      }
    } else {
      // standard status update`;
const h2EndReplace = `        } finally {
          setIsSaving(false);
        }
      });
    } else {
      // standard status update`;
content = content.replace(h2EndSearch, h2EndReplace);

// 4. handleConfirmOrderSubmit wrap
const h3Search = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Received amount.");
      return;
    }

    try {`;
const h3Replace = `    if (confirmForm.advance_received === undefined || isNaN(confirmForm.advance_received)) {
      alert("Please enter Advance Received amount.");
      return;
    }

    executeWithReportingPopup(async () => {
      try {`;
content = content.replace(h3Search, h3Replace);

const h3EndSearch = `    } finally {
      setIsSaving(false);
    }
  };

  // Filter Leads List`;
const h3EndReplace = `    } finally {
      setIsSaving(false);
    }
    });
  };

  // Filter Leads List`;
content = content.replace(h3EndSearch, h3EndReplace);

// 5. Inject Reporting Popup UI
const popupUI = `
      {/* Delete Package Confirmation / Safety Check Modal */}
      
      {/* Reporting Popup Modal */}
      {showReportingPopup && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-sm w-full shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>📅</span> Reporting Details
              </h4>
              <button 
                onClick={() => {
                  setShowReportingPopup(false);
                  setPendingConfirmAction(null);
                }}
                className="text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reporting Date *</label>
                <input
                  type="date"
                  required
                  value={reportingPopupData.date}
                  onChange={(e) => setReportingPopupData({ ...reportingPopupData, date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reporting Time *</label>
                <input
                  type="time"
                  required
                  value={reportingPopupData.time}
                  onChange={(e) => setReportingPopupData({ ...reportingPopupData, time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowReportingPopup(false);
                  setPendingConfirmAction(null);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReportingSaving || !reportingPopupData.date || !reportingPopupData.time}
                onClick={async () => {
                  if (!reportingPopupData.date) {
                    showToastMsg("Reporting Date is required.", "error");
                    return;
                  }
                  if (!reportingPopupData.time) {
                    showToastMsg("Reporting Time is required.", "error");
                    return;
                  }
                  
                  setIsReportingSaving(true);
                  try {
                    // Save to Supabase leads table
                    const targetLeadId = selectedLead?.lead_id || createdLeadId;
                    if (targetLeadId && supabaseClient) {
                      const { error } = await supabaseClient
                        .from('leads')
                        .update({ 
                          Reporting_date: reportingPopupData.date, 
                          reporting_time: reportingPopupData.time 
                        })
                        .eq('lead_id', targetLeadId);
                        
                      if (error) throw error;
                    }
                    
                    // Proceed with original action
                    if (pendingConfirmAction) {
                      await pendingConfirmAction();
                    }
                    
                    setShowReportingPopup(false);
                    setPendingConfirmAction(null);
                  } catch (err: any) {
                    console.error("Reporting details save failed:", err);
                    showToastMsg("Failed to save Reporting details: " + err.message, "error");
                  } finally {
                    setIsReportingSaving(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20 text-xs"
              >
                {isReportingSaving ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
`;
content = content.replace(`      {/* Delete Package Confirmation / Safety Check Modal */}`, popupUI);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched SalesModule.tsx");
