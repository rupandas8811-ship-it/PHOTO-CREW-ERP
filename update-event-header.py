import re
with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target = r"""                    let loadError = null;
                    if \(includedRoles.length === 0\) \{
                      loadError = `No Team Members specified for event "\$\{evName\}". You can manually add staff roles below.`;
                    \}

                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const isCollapsed = collapsedAssignEvents\[evId\] === undefined \? \(isMobile \? true : index !== 0\) : collapsedAssignEvents\[evId\];
                    const eventNameDisplay = ev.event_type === 'Other' \? \(ev.event_name \|\| 'Other'\) : \(ev.event_type \|\| 'N/A'\);

                    return \(
                      <div key=\{evId\} id=\{`assign-event-\$\{evId\}`\} className="bg-zinc-950/60 border border-zinc-850 rounded-2xl relative overflow-hidden transition-all duration-300">
                        \{\/\* Collapsible Header \*\/\}
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors"
                          onClick=\{\(\) => setCollapsedAssignEvents\(prev => \(\{ ...prev, \[evId\]: !isCollapsed \}\)\)\}
                        > 
                           <div className="flex items-center gap-3">
                              <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-\[10px\] text-zinc-500 select-none uppercase font-bold font-mono">
                                🎥 EVENT \{index \+ 1\}
                              </span>
                              <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
                                \{eventNameDisplay\}
                              </h4>
                           </div>
                           <div className="flex items-center gap-4">
                              \{allocStaff.length > 0 && \(
                                <span className="text-\[10px\] font-mono px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                  \{allocStaff.length\} Staff Assigned
                                </span>
                              \)\}
                              <span className=\{`text-zinc-500 transition-transform duration-300 \$\{isCollapsed \? '' : 'rotate-180'\}`\}>▼</span>
                           </div>
                        </div>"""

repl = """                    let loadError = null;
                    if (includedRoles.length === 0) {
                      loadError = `No Team Members specified for event "${evName}". You can manually add staff roles below.`;
                    }

                    let evTotalRequired = 0;
                    let evTotalAssigned = 0;
                    let isEvFullyAssigned = true;
                    
                    if (includedRoles.length > 0) {
                      const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
                      includedRoles.forEach((roleStr: string) => {
                        const { qty, text } = parseQtyAndText(roleStr);
                        const roleName = (text || roleStr).trim();
                        if (!roleName) return;
                        if (tasksMap.has(roleName)) {
                          tasksMap.get(roleName)!.targetQty += (qty || 1);
                        } else {
                          tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
                        }
                      });
                      const validEvAllocStaff = allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '');
                      for (const task of Array.from(tasksMap.values())) {
                        evTotalRequired += task.targetQty;
                        const assignedCount = validEvAllocStaff.filter((s: any) => s.staff_role === task.roleName).length;
                        evTotalAssigned += Math.min(assignedCount, task.targetQty);
                        if (assignedCount < task.targetQty) {
                          isEvFullyAssigned = false;
                        }
                      }
                    } else {
                       evTotalAssigned = allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '').length;
                    }

                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                    const isCollapsed = collapsedAssignEvents[evId] === undefined ? (isMobile ? true : index !== 0) : collapsedAssignEvents[evId];
                    const eventNameDisplay = ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A');

                    return (
                      <div key={evId} id={`assign-event-${evId}`} className="bg-zinc-950/60 border border-zinc-850 rounded-2xl relative overflow-hidden transition-all duration-300">
                        {/* Collapsible Header */}
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors"
                          onClick={() => setCollapsedAssignEvents(prev => ({ ...prev, [evId]: !isCollapsed }))}
                        > 
                           <div className="flex items-center gap-3">
                              <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-500 select-none uppercase font-bold font-mono">
                                🎥 EVENT {index + 1}
                              </span>
                              <h4 className="text-sm font-sans font-bold text-white uppercase tracking-wide">
                                {eventNameDisplay}
                              </h4>
                           </div>
                           <div className="flex items-center gap-4">
                              {includedRoles.length > 0 ? (
                                <span className={`text-[10px] font-mono px-2 py-1 border rounded-md ${isEvFullyAssigned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                  {evTotalAssigned} / {evTotalRequired} Assigned → {isEvFullyAssigned ? 'Assigned' : 'Pending'}
                                </span>
                              ) : allocStaff.length > 0 ? (
                                <span className="text-[10px] font-mono px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                                  {allocStaff.length} Staff Assigned
                                </span>
                              ) : null}
                              <span className={`text-zinc-500 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
                           </div>
                        </div>"""

content = re.sub(target, repl, content)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
