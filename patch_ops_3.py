import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

modal_start_str = """          <div id="assign_staff_modal" className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl shadow-2xl relative animate-in zoom-in duration-200 overflow-hidden">"""
modal_end_str = """      {/* Raw Footage Received Modal */}"""

start_idx = content.find(modal_start_str)
end_idx = content.find(modal_end_str)

new_modal_jsx = """          <div id="assign_staff_modal" className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in duration-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold font-mono">Operations</span>
                <h3 className="text-sm font-sans font-black text-white">
                  Project Staffing & Handover Dossier ~ {assigningOrderId}
                </h3>
              </div>
              <button 
                onClick={() => setAssigningOrderId(null)}
                className="text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
                type="button"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="flex flex-col">
              <div className="p-5 overflow-y-auto max-h-[75vh] space-y-6">
                
                {/* 1. Customer Information */}
                <div className="bg-zinc-950/45 border border-zinc-850 p-4 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none">
                    👤 CUSTOMER
                  </div>
                  <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Customer Name</span>
                      <span className="font-bold text-white font-sans text-xs block">
                        {activeOrderInstance?.customer_name || parentLeadInstance?.customer_name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">Mobile Number</span>
                      <span className="font-mono text-zinc-200 font-medium block">
                        {activeOrderInstance?.mobile || parentLeadInstance?.mobile || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Alt / WhatsApp</span>
                      <span className="font-mono text-zinc-200 font-medium flex items-center gap-1">
                        {parentLeadInstance?.alternate_mobile || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Email</span>
                      <span className="font-sans text-zinc-200 font-medium block">
                        {parentLeadInstance?.email || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2 md:col-span-4">
                      <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Address</span>
                      <span className="text-zinc-200 font-sans text-[11px] block leading-tight">
                        {parentLeadInstance?.event_location || activeOrderInstance?.event_location || parentLeadInstance?.address || 'N/A'}
                      </span>
                    </div>
                    {parentLeadInstance?.google_maps_link && (
                      <div className="col-span-2 md:col-span-4">
                        <span className="text-[10px] text-zinc-505 block uppercase font-mono">Google Maps Link</span>
                        <a 
                          href={parentLeadInstance.google_maps_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-sans text-[11px] break-all block underline"
                        >
                          {parentLeadInstance.google_maps_link}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Multiple Events Iteration */}
                {parentLeadInstance?.events && parentLeadInstance.events.map((ev, index) => {
                  const evId = ev.id || `EV-N/A-${index}`;
                  const allocation = eventAllocations[evId] || { staff: [] };
                  const allocStaff = allocation.staff || [];
                  
                  return (
                    <div key={evId} className="bg-zinc-950/60 border border-zinc-850 p-5 rounded-2xl space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 text-[10px] text-zinc-655 select-none uppercase">
                        🎥 EVENT {index + 1}
                      </div>
                      
                      {/* 2. Event & Package Coordinates */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                          Event & Package Coordinates
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Type</span>
                            <span className="font-semibold text-white uppercase text-[11px] block">
                              {ev.event_type === 'Other' ? (ev.event_name || 'Other') : (ev.event_type || 'N/A')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono">Shoot Type</span>
                            <span className="text-zinc-350 font-medium uppercase text-[11px] block">
                              {ev.event_shoot_type || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono">Guest Pax</span>
                            <span className="font-mono text-zinc-300 block">{ev.guest_pax || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-505 block uppercase font-mono">Staff Pax</span>
                            <span className="font-mono text-zinc-300 block">{ev.staff_pax || 0}</span>
                          </div>
                          
                          {/* 8. Reporting Information (editable) */}
                          <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Reporting Date</span>
                              <input 
                                type="date" 
                                value={allocation.reporting_date || ''}
                                onChange={e => setEventAllocations(prev => ({
                                  ...prev, [evId]: { ...prev[evId], reporting_date: e.target.value }
                                }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Reporting Time</span>
                              <input 
                                type="time" 
                                value={allocation.reporting_time || ''}
                                onChange={e => setEventAllocations(prev => ({
                                  ...prev, [evId]: { ...prev[evId], reporting_time: e.target.value }
                                }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Start</span>
                              <input 
                                type="time" 
                                value={allocation.event_start_time || ''}
                                onChange={e => setEventAllocations(prev => ({
                                  ...prev, [evId]: { ...prev[evId], event_start_time: e.target.value }
                                }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event End</span>
                              <input 
                                type="time" 
                                value={allocation.event_end_time || ''}
                                onChange={e => setEventAllocations(prev => ({
                                  ...prev, [evId]: { ...prev[evId], event_end_time: e.target.value }
                                }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-xs text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Staff Assignment */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[11px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                          Staff Assignments
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2 items-end">
                           <div className="flex-1">
                             <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Role</label>
                             <select
                               value={selectedRole}
                               onChange={(e) => {
                                 const role = e.target.value;
                                 setSelectedRole(role);
                                 const available = staff ? staff.filter(s => s.role === role && s.status === 'Active') : [];
                                 setSelectedStaff(available.length > 0 ? available[0].name : '');
                               }}
                               className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                             >
                               <option value="Lead Photographer">Lead Photographer</option>
                               <option value="Associate Photographer">Associate Photographer</option>
                               <option value="Lead Videographer">Lead Videographer</option>
                               <option value="Drone & Aerial Operator">Drone & Aerial Operator</option>
                               <option value="Production Assistant">Production Assistant</option>
                               <option value="Post-Production Editor">Post-Production Editor</option>
                             </select>
                           </div>
                           <div className="flex-1">
                             <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Member</label>
                             <select
                               value={selectedStaff}
                               onChange={(e) => setSelectedStaff(e.target.value)}
                               className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                             >
                               <option value="">-- Choose Staff member --</option>
                               {staff && staff.filter(s => s.role === selectedRole && s.status === 'Active').map(st => (
                                 <option key={st.staff_id} value={st.name}>{st.name}</option>
                               ))}
                             </select>
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               if (!selectedStaff) return;
                               const memberInfo = staff.find(st => st.name === selectedStaff);
                               const staffId = memberInfo?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4);
                               
                               setEventAllocations(prev => {
                                 const existingAlloc = prev[evId] || { staff: [] };
                                 return {
                                   ...prev,
                                   [evId]: {
                                     ...existingAlloc,
                                     staff: [...(existingAlloc.staff || []), { staff_role: selectedRole, staff_id: staffId, staff_name: selectedStaff }]
                                   }
                                 };
                               });
                             }}
                             className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold rounded-lg border border-sky-500/30 transition-all uppercase"
                           >
                             + Add
                           </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {allocStaff.length > 0 ? allocStaff.map((st, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-750 px-2 py-1 rounded-md">
                              <div className="text-[10px] text-zinc-400 font-mono">{st.staff_role}</div>
                              <div className="text-xs font-bold text-white font-sans">{st.staff_name}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setEventAllocations(prev => {
                                    const existingAlloc = prev[evId];
                                    return {
                                      ...prev,
                                      [evId]: {
                                        ...existingAlloc,
                                        staff: existingAlloc.staff.filter((_, idx) => idx !== i)
                                      }
                                    };
                                  });
                                }}
                                className="text-red-400 hover:text-red-300 ml-1 font-bold text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                          )) : (
                            <span className="text-[10px] italic text-zinc-500 font-mono">No staff assigned to this event yet.</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 4. WhatsApp Sharing */}
                      {allocStaff.length > 0 && (
                        <div className="pt-3 mt-4 border-t border-zinc-800">
                          <button
                            type="button"
                            onClick={() => {
                              const text = `*Event Schedule & Assignment*\\n\\n`
                                + `Customer: ${activeOrderInstance?.customer_name}\\n`
                                + `Event: ${ev.event_type === 'Other' ? ev.event_name : ev.event_type}\\n`
                                + `Location: ${parentLeadInstance?.event_location}\\n`
                                + `Reporting: ${allocation.reporting_date} at ${allocation.reporting_time}\\n\\n`
                                + `*Team:*\\n` + allocStaff.map(s => `- ${s.staff_role}: ${s.staff_name}`).join('\\n');
                                
                              const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                              window.open(url, '_blank');
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-[10px] font-mono font-bold rounded cursor-pointer transition-all uppercase"
                          >
                            <span>📱</span> Share via WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                
              </div>
              
              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950/40">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-mono font-bold uppercase rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving Assignments...' : 'Save All Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

"""

content = content[:start_idx] + new_modal_jsx + content[end_idx:]

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
print("done step 3")
