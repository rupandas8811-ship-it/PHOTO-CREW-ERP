import re

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'r') as f:
    content = f.read()

# I want to add the display for conflicts/schedule inside the dropdown.
# Inside the `equipmentWithAvailability.map` there's a div returning the item.
# I'll expand it to show the table if schedule exists or if conflicts exist.

# Wait, `reason` is already shown. But the user wants a clear warning:
# "When the requested equipment has a time conflict, show a clear warning immediately."
# "When the user searches/selects equipment, show availability information in a clear table where appropriate."

replacement = """
                        {/* Sub-info: Serial number or location if available */}
                        <div className="flex flex-col gap-1 mt-1 text-[10px] text-zinc-500 font-mono">
                          <div className="flex items-center gap-2">
                            {eq.serial_number && <span>SN: {eq.serial_number}</span>}
                            {eq.storage_location && <span>Loc: {eq.storage_location}</span>}
                          </div>
                          
                          {eq.reason && !eq.canAssign && eq.conflicts.length === 0 && (
                            <span className="text-rose-400/90 font-sans italic truncate max-w-[220px]">
                              • {eq.reason}
                            </span>
                          )}

                          {eq.conflicts && eq.conflicts.length > 0 && (
                            <div className="mt-2 bg-rose-500/10 border border-rose-500/20 rounded p-2 text-rose-300">
                              <div className="font-bold font-sans text-[11px] mb-1 flex items-center gap-1">
                                <AlertCircle size={12} /> Equipment Not Available (Time Overlap)
                              </div>
                              <div className="text-[10px] space-y-1">
                                {eq.conflicts.map((c: any, i: number) => (
                                  <div key={i} className="pl-3 border-l-2 border-rose-500/30">
                                    <div><strong>Staff:</strong> {c.staffName}</div>
                                    <div><strong>Event:</strong> {c.eventName} ({c.eventDate})</div>
                                    <div><strong>Time:</strong> {c.startTime || '?'} - {c.endTime || '?'}</div>
                                  </div>
                                ))}
                                <div className="mt-1 pt-1 border-t border-rose-500/20 italic">
                                  Requested: {targetEventDate} {targetStartTime ? `${targetStartTime} - ${targetEndTime || '?'}` : ''}
                                </div>
                              </div>
                            </div>
                          )}

                          {eq.schedule && eq.schedule.length > 0 && eq.conflicts.length === 0 && (
                            <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-emerald-300">
                              <div className="font-bold font-sans text-[11px] mb-1 flex items-center gap-1">
                                <Check size={12} /> Equipment Available
                              </div>
                              <div className="text-[10px] text-emerald-400/80 mb-1">
                                Available for requested time: {targetStartTime ? `${targetStartTime} - ${targetEndTime || '?'}` : ''}
                              </div>
                              <div className="mt-1">
                                <div className="text-[9px] uppercase tracking-wider mb-1 text-zinc-400">Other Schedule for {targetEventDate}:</div>
                                {eq.schedule.map((s: any, i: number) => (
                                  <div key={i} className="pl-2 border-l-2 border-emerald-500/30 mb-0.5">
                                    {s.startTime || '?'} - {s.endTime || '?'} | {s.eventName} ({s.staffName})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
"""

content = re.sub(
    r'\{/\* Sub-info: Serial number or location if available \*/\}.*?</div>',
    replacement.strip(),
    content,
    flags=re.DOTALL
)

with open('src/components/operations/EquipmentSelectorDropdown.tsx', 'w') as f:
    f.write(content)

