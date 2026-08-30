import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

replacement = """
        )}

      {/* Conflict Modal Portal */}
      {conflictModalState?.isOpen && conflictModalState.equipment &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
               style={{ touchAction: 'none' }}>
            <div className="bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-md max-h-[100dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Equipment Busy
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {conflictModalState.equipment.equipment_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConflictModalState(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto scrollbar-thin">
                {conflictModalState.equipment.conflicts && conflictModalState.equipment.conflicts.length > 0 ? (
                  <div className="space-y-4">
                    {/* Existing Assignments */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold px-1">
                        Currently Assigned
                      </h4>
                      {conflictModalState.equipment.conflicts.map((c: any, i: number) => (
                        <div key={i} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                          <div className="grid grid-cols-[60px_1fr] gap-y-1.5 text-xs">
                            <span className="text-zinc-500 font-medium">Staff:</span>
                            <span className="text-zinc-200 font-bold">{c.staffName}</span>
                            
                            <span className="text-zinc-500 font-medium">Event:</span>
                            <span className="text-zinc-200">{c.eventName}</span>
                            
                            <span className="text-zinc-500 font-medium">Date:</span>
                            <span className="text-zinc-200">{c.eventDate}</span>
                            
                            <span className="text-zinc-500 font-medium">Time:</span>
                            <span className="text-rose-300 font-mono font-medium">{c.startTime || '?'} – {c.endTime || '?'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Requested Assignment */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold px-1">
                        Requested
                      </h4>
                      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                        <div className="grid grid-cols-[60px_1fr] gap-y-1.5 text-xs">
                          <span className="text-zinc-500 font-medium">Staff:</span>
                          <span className="text-zinc-200 font-bold">{targetStaffName || 'Current Staff'}</span>
                          
                          <span className="text-zinc-500 font-medium">Event:</span>
                          <span className="text-zinc-200">Current Assignment</span>
                          
                          <span className="text-zinc-500 font-medium">Date:</span>
                          <span className="text-zinc-200">{targetEventDate || '?'}</span>
                          
                          <span className="text-zinc-500 font-medium">Time:</span>
                          <span className="text-emerald-300 font-mono font-medium">{targetStartTime || '?'} – {targetEndTime || '?'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-300 block mb-1 text-xs">Reason:</strong>
                      The requested time overlaps with the existing equipment assignment.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <p className="text-rose-400 font-semibold mb-1">
                      Status: BUSY — NOT AVAILABLE
                    </p>
                    <p className="text-sm text-zinc-400 px-4">
                      {conflictModalState.equipment.reason || 'This equipment is currently unavailable due to maintenance, damage, or another assignment.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setConflictModalState(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-bold transition-colors w-full sm:w-auto"
                >
                  Understood
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
"""

content = content.replace("        )}\n    </div>", replacement)

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

