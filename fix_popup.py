import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

start_marker = "      {/* CLIENT ACCEPTANCE POPUP */}"
end_marker = "        })()}\n      </AnimatePresence>"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find start marker")
    exit(1)

end_idx = content.find(end_marker, start_idx) + len(end_marker)

replacement = """      {/* CLIENT ACCEPTANCE POPUP */}
      <AnimatePresence>
        {clientAcceptanceProd && (() => {
          const { order, lead } = resolveOrderAndLead(clientAcceptanceProd);
          const trackingId = clientAcceptanceProd.tracking_id || 'N/A';
          
          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-5 flex justify-between items-start">
                  <div>
                    <h3 className="text-[13px] font-black text-white flex items-center gap-1.5 uppercase tracking-widest font-mono">
                      <span className="text-emerald-400">✓</span> CLIENT APPROVAL
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-2 font-mono uppercase tracking-wider">
                      PROJECT ID: <span className="text-violet-400 font-bold">{clientAcceptanceProd.production_id}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientAcceptanceProd(null);
                      setCaUploadConfirmations({});
                    }}
                    className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>

                {/* Body Form */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    
                    try {
                      setIsSaving(true);
                      
                      const updates: any = {
                        editing_status: 'Client Accepted',
                        checklist_customer_acceptance: caVerifyCustomerAcceptance,
                        checklist_content_usage: caContentUsageConfirmation,
                        checklist_footage_deleted_7_days: caFootageDeleted7Days,
                        checklist_payment_from_sales: caVerifyPaymentSales,
                        checklist_edited_files_uploaded: caValidateEditedFiles,
                        server_upload_validated: caValidateEditedFiles,
                        validated_server_uploads: caValidatedServerUploads
                      };
                      
                      await updateProduction(clientAcceptanceProd.production_id, updates);
                      
                      const targetId = order?.order_id || trackingId || clientAcceptanceProd.production_id;
                      if (targetId) {
                        await updateOrderStage(targetId, 'Client Accepted' as any);
                      }
                      
                      if (refreshData) {
                        await refreshData();
                      }
                      setClientAcceptanceProd(null);
                    } catch (err: any) {
                      alert(`Error finalizing Client Acceptance: ${err.message || err}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="px-5 pb-5 space-y-4 flex flex-col"
                >
                  <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[60vh] pr-2">
                    <label className="flex items-center gap-3.5 p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={caVerifyCustomerAcceptance}
                        onChange={(e) => setCaVerifyCustomerAcceptance(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer appearance-none checked:bg-white checked:border-white relative before:content-[''] checked:before:absolute checked:before:w-1.5 checked:before:h-2.5 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-black checked:before:rotate-45 checked:before:top-[1px] checked:before:left-[5px]"
                      />
                      <span className="text-[13px] font-bold text-zinc-100">
                        Client Approval
                      </span>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={caContentUsageConfirmation}
                        onChange={(e) => setCaContentUsageConfirmation(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer appearance-none checked:bg-white checked:border-white relative before:content-[''] checked:before:absolute checked:before:w-1.5 checked:before:h-2.5 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-black checked:before:rotate-45 checked:before:top-[1px] checked:before:left-[5px]"
                      />
                      <span className="text-[13px] font-bold text-zinc-100">
                        Content Usage Confirmation
                      </span>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={caFootageDeleted7Days}
                        onChange={(e) => setCaFootageDeleted7Days(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer appearance-none checked:bg-white checked:border-white relative before:content-[''] checked:before:absolute checked:before:w-1.5 checked:before:h-2.5 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-black checked:before:rotate-45 checked:before:top-[1px] checked:before:left-[5px]"
                      />
                      <span className="text-[13px] font-bold text-zinc-100">
                        Footage Deleted in 7 Days
                      </span>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={caVerifyPaymentSales}
                        onChange={(e) => setCaVerifyPaymentSales(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer appearance-none checked:bg-white checked:border-white relative before:content-[''] checked:before:absolute checked:before:w-1.5 checked:before:h-2.5 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-black checked:before:rotate-45 checked:before:top-[1px] checked:before:left-[5px]"
                      />
                      <span className="text-[13px] font-bold text-zinc-100">
                        Verify Payment from Sales
                      </span>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 bg-[#0f0f11] border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={caValidateEditedFiles}
                        onChange={(e) => setCaValidateEditedFiles(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer appearance-none checked:bg-white checked:border-white relative before:content-[''] checked:before:absolute checked:before:w-1.5 checked:before:h-2.5 checked:before:border-r-2 checked:before:border-b-2 checked:before:border-black checked:before:rotate-45 checked:before:top-[1px] checked:before:left-[5px]"
                      />
                      <span className="text-[13px] font-bold text-zinc-100">
                        Validate Edited Files Uploaded to Server
                      </span>
                    </label>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setClientAcceptanceProd(null);
                        setCaUploadConfirmations({});
                      }}
                      className="py-3.5 px-6 bg-[#1f1f22] hover:bg-[#2a2a2d] text-zinc-100 font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      disabled={isSaving || isSavingProgress}
                      onClick={async () => {
                        try {
                          setIsSavingProgress(true);
                          const updates: any = {
                            checklist_customer_acceptance: caVerifyCustomerAcceptance,
                            checklist_content_usage: caContentUsageConfirmation,
                            checklist_footage_deleted_7_days: caFootageDeleted7Days,
                            checklist_payment_from_sales: caVerifyPaymentSales,
                            checklist_edited_files_uploaded: caValidateEditedFiles,
                            server_upload_validated: caValidateEditedFiles,
                            validated_server_uploads: caValidatedServerUploads
                          };
                          
                          await updateProduction(clientAcceptanceProd.production_id, updates);
                          // Do NOT change project status. Do NOT send project to Business Owner. Just save state.
                        } catch (err: any) {
                          alert(`Failed to save progress: ${err.message}`);
                        } finally {
                          setIsSavingProgress(false);
                        }
                      }}
                      className="py-3.5 px-6 bg-[#2a2a2d] hover:bg-[#353538] text-[#e0b04a] font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {isSavingProgress ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isSavingProgress}
                      className="flex-1 py-3.5 px-6 bg-[#00A36C] hover:bg-[#008F5D] text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      {isSaving ? 'SUBMITTING...' : '✓ CLIENT APPROVED'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>"""

new_content = content[:start_idx] + replacement + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(new_content)

print("Replacement done successfully.")
