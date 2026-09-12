import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

# I inserted a form inside ASSIGNED TASKS POPUP that ends with </form>
# The inserted form has the text "Validate Edited Files Uploaded to Server" inside it.

start_marker = "                {/* Header */}\n                <div className=\"p-5 border-b border-zinc-900/50 flex justify-between items-center bg-[#0c0d11]\">"
end_marker = "                </form>"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Could not find start marker")
    exit(1)

# Find the end of my inserted form. It's the first </form> after start_idx.
end_idx = content.find(end_marker, start_idx) + len(end_marker)

replacement = """                {/* Header */}
                <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-[#0c0d11]">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider font-mono">
                      <span>📋</span> Assigned Tasks: {selectedStaffForTasks}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStaffForTasks(null)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer font-bold text-xs"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="p-5 overflow-y-auto max-h-[60vh]">
                  {staffTasks.length === 0 ? (
                    <p className="text-zinc-500 text-center py-4 text-xs font-mono">No active tasks found for this staff member.</p>
                  ) : (
                    <div className="space-y-3">
                      {staffTasks.map(task => (
                         <div key={task.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                           <div className="flex justify-between items-center">
                             <span className="font-bold text-white text-xs">Project: {task.production_id}</span>
                             <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">{task.status}</span>
                           </div>
                           <div className="text-[11px] text-zinc-400 font-mono">Deliverable: {task.deliverables}</div>
                           <div className="text-[11px] text-zinc-400 font-mono">Event: {task.event_id}</div>
                         </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* CUSTOMER REVIEW RESEND POPUP */}
      <AnimatePresence>
        {customerReviewResendProd && (() => {
          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]"
              >
                {/* Header */}
                <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-[#0c0d11]">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-wider font-mono">
                      <span>💬</span> Send Review Link
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomerReviewResendProd(null)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer font-bold text-xs"
                  >
                    ✕ Close
                  </button>
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSaving(true);
                  setTimeout(() => { setIsSaving(false); setCustomerReviewResendProd(null); }, 500);
                }} className="p-5 space-y-4">
                  <p className="text-xs text-zinc-400 font-mono">Send the review link to the customer via WhatsApp.</p>
                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCustomerReviewResendProd(null)}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>💬</span> {isSaving ? 'Saving...' : 'Send via WhatsApp'}
                    </button>
                  </div>
                </form>"""

new_content = content[:start_idx] + replacement + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(new_content)

print("Restored successfully.")
