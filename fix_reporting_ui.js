import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const searchStr = `      {showReportingPopup && (
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
      )}`;

const replaceStr = `      {showReportingPopup && (
        <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-slate-850 border border-slate-750 rounded-xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
              <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5 font-sans">
                <span>📅</span> Reporting Details for Events
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
            
            <div className="overflow-y-auto p-5 space-y-6">
              {reportingPopupData.map((ev, index) => (
                <div key={ev.eventId || index} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
                  <h5 className="font-bold text-emerald-400 text-xs uppercase tracking-wider mb-2 border-b border-slate-800/50 pb-2">
                    {ev.eventName}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reporting Date *</label>
                      <input
                        type="date"
                        required
                        value={ev.date}
                        onChange={(e) => {
                          const newData = [...reportingPopupData];
                          newData[index].date = e.target.value;
                          setReportingPopupData(newData);
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Reporting Time *</label>
                      <input
                        type="time"
                        required
                        value={ev.time}
                        onChange={(e) => {
                          const newData = [...reportingPopupData];
                          newData[index].time = e.target.value;
                          setReportingPopupData(newData);
                        }}
                        className="w-full bg-slate-900 border border-slate-750 rounded-lg py-2 px-3 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 p-5 shrink-0 bg-slate-900">
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
                disabled={isReportingSaving || reportingPopupData.some(ev => !ev.date || !ev.time)}
                onClick={async () => {
                  // Validate all
                  for (let i=0; i<reportingPopupData.length; i++) {
                    const ev = reportingPopupData[i];
                    if (!ev.date) {
                      showToastMsg(\`Reporting Date is required for \${ev.eventName}\`, "error");
                      return;
                    }
                    if (!ev.time) {
                      showToastMsg(\`Reporting Time is required for \${ev.eventName}\`, "error");
                      return;
                    }
                  }
                  
                  setIsReportingSaving(true);
                  try {
                    const targetLeadId = selectedLead?.lead_id || createdLeadId;
                    if (targetLeadId && supabaseClient) {
                      // Save to leads (just the first event's reporting date to satisfy lead-level field, or all if we can)
                      // "Save the Reporting Date to the related lead."
                      const firstDate = reportingPopupData[0]?.date;
                      if (firstDate) {
                        const { error: leadErr } = await supabaseClient
                          .from('leads')
                          .update({ Reporting_date: firstDate })
                          .eq('lead_id', targetLeadId);
                        if (leadErr) throw leadErr;
                      }

                      // Save reporting_time for each event in lead_events
                      for (const ev of reportingPopupData) {
                        if (ev.eventId !== 'default') {
                          const { error: evErr } = await supabaseClient
                            .from('lead_events')
                            .update({ reporting_time: ev.time })
                            .eq('id', ev.eventId);
                          if (evErr) throw evErr;
                        }
                      }
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
      )}`;

content = content.replace(searchStr, replaceStr);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Updated UI logic");
