import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

start_marker = "                {/* Header */}"
end_marker = "                </form>"

# find start and end
start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_form = """                {/* Header */}
                <div className="p-5 border-b border-zinc-900/50 flex justify-between items-center bg-[#0c0d11]">
                  <div>
                    <h3 className="text-xs font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                      <span>✓</span> CLIENT APPROVAL
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1 font-mono uppercase">
                      PROJECT ID: <span className="text-violet-400 font-bold">{clientAcceptanceProd.production_id}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setClientAcceptanceProd(null);
                      setCaUploadConfirmations({});
                    }}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-all cursor-pointer flex items-center justify-center"
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
                      
                      alert('Client Approval submitted successfully.');
                      setClientAcceptanceProd(null);
                    } catch (err: any) {
                      alert(`Error submitting Client Approval: ${err.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="p-5 space-y-3 bg-[#0c0d11] max-h-[70vh] overflow-y-auto custom-scrollbar"
                >
                  <label className="flex items-center gap-3 p-3.5 bg-[#0c0d11] border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={caVerifyCustomerAcceptance}
                      onChange={(e) => setCaVerifyCustomerAcceptance(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-100">
                      Client Approval
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-[#0c0d11] border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={caContentUsageConfirmation}
                      onChange={(e) => setCaContentUsageConfirmation(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-100">
                      Content Usage Confirmation
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-[#0c0d11] border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={caFootageDeleted7Days}
                      onChange={(e) => setCaFootageDeleted7Days(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-100">
                      Footage Deleted in 7 Days
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-[#0c0d11] border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={caVerifyPaymentSales}
                      onChange={(e) => setCaVerifyPaymentSales(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-100">
                      Verify Payment from Sales
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 bg-[#0c0d11] border border-zinc-900 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={caValidateEditedFiles}
                      onChange={(e) => setCaValidateEditedFiles(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 transition-colors cursor-pointer"
                    />
                    <span className="text-xs font-bold text-zinc-100">
                      Validate Edited Files Uploaded to Server
                    </span>
                  </label>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setClientAcceptanceProd(null);
                        setCaUploadConfirmations({});
                      }}
                      className="py-3 px-6 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-zinc-800"
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
                        } catch (err: any) {
                          alert(`Failed to save progress: ${err.message}`);
                        } finally {
                          setIsSavingProgress(false);
                        }
                      }}
                      className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-amber-500 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 border border-zinc-700"
                    >
                      {isSavingProgress ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || isSavingProgress}
                      className="flex-1 py-3 px-6 bg-[#00A36C] hover:bg-[#008F5D] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? 'SUBMITTING...' : '✓ CLIENT APPROVED'}
                    </button>
                  </div>
                </form>"""

new_content = content[:start_idx] + new_form + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(new_content)

print("Replacement done successfully.")
