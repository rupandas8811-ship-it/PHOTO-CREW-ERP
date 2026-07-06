import fs from 'fs';
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

// 1. Add import
if (!content.includes("import { supabaseClient } from")) {
    content = content.replace(
      "import { convertTimeToDbFormat, triggerAutoScrollAndFocus } from '../../utils';",
      "import { convertTimeToDbFormat, triggerAutoScrollAndFocus } from '../../utils';\nimport { supabaseClient } from '../../supabaseClient';"
    );
}

// 2. Add selectedStaffByEvent
if (!content.includes("const [selectedStaffByEvent,")) {
    content = content.replace(
      "const [selectedRole, setSelectedRole] = useState('Lead Photographer');",
      "const [selectedRole, setSelectedRole] = useState('Lead Photographer');\n  const [selectedStaffByEvent, setSelectedStaffByEvent] = useState<Record<string, string>>({});"
    );
}

// 3. Update startAssigning
const startAssigningOld = `    const existing = isNewAssignment ? [] : (staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : []);
    setActiveAssignments(existing.map(e => ({
      staff_role: e.staff_role,
      staff_id: e.staff_id,
      staff_name: e.staff_name
    })));

    setAssignForm({`;

const startAssigningNew = `    const existing = isNewAssignment ? [] : (staffAssignments ? staffAssignments.filter(sa => sa.order_id === order.order_id) : []);
    setActiveAssignments(existing.map(e => ({
      staff_role: e.staff_role,
      staff_id: e.staff_id,
      staff_name: e.staff_name
    })));

    const targetLead = leads?.find(l => l.lead_id === order.lead_id);
    const initialAllocations: Record<string, any> = {};
    if (targetLead?.events && targetLead.events.length > 0) {
      targetLead.events.forEach((ev, index) => {
        const evId = ev.id || \`EV-N/A-\${index}\`;
        const staffNames = ev.assigned_staff_names ? ev.assigned_staff_names.split(', ') : [];
        const staffMobiles = ev.assigned_staff_mobiles ? ev.assigned_staff_mobiles.split(', ') : [];
        const staffList = staffNames.map((name, i) => {
          const st = staff?.find(s => s.name === name);
          return {
             staff_role: st?.role || 'Staff',
             staff_id: st?.staff_id || 'MOCK',
             staff_name: name,
             mobile: staffMobiles[i] || ''
          };
        });

        initialAllocations[evId] = {
           reporting_date: targetLead.Reporting_date || ev.event_date || '',
           reporting_time: ev.reporting_time || '',
           event_start_time: ev.event_start_time || '',
           event_end_time: ev.event_end_time || '',
           staff: staffList
        };
      });
    } else if (targetLead) {
       initialAllocations['default'] = {
           reporting_date: targetLead.Reporting_date || '',
           reporting_time: targetLead.reporting_time || '',
           event_start_time: '',
           event_end_time: '',
           staff: []
       };
    }
    setEventAllocations(initialAllocations);
    setSelectedStaffByEvent({});

    setAssignForm({`;

content = content.replace(startAssigningOld, startAssigningNew);

// 4. Update Event UI Reporting info
const reportingInfoOld = `{/* 8. Reporting Information (editable) */}
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
                          </div>`;

const reportingInfoNew = `{/* 8. Reporting Information (Read-only) */}
                          <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Reporting Date</span>
                              <span className="text-zinc-200 text-xs font-mono block mt-1">{allocation.reporting_date || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Reporting Time</span>
                              <span className="text-zinc-200 text-xs font-mono block mt-1">{allocation.reporting_time || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event Start</span>
                              <span className="text-zinc-200 text-xs font-mono block mt-1">{allocation.event_start_time || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-505 block uppercase font-mono">Event End</span>
                              <span className="text-zinc-200 text-xs font-mono block mt-1">{allocation.event_end_time || 'N/A'}</span>
                            </div>
                          </div>`;

content = content.replace(reportingInfoOld, reportingInfoNew);

// 5. Update Staff Assignment UI
const staffUIRegex = /\{\/\* 3\. Staff Assignment \*\/\}.*?(?=<div className="flex flex-wrap gap-2 mt-3">)/s;

const staffUINew = `{/* 3. Staff Assignment */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[11px] font-mono font-bold uppercase text-sky-400 tracking-wider">
                          Staff Assignments
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-2 items-end">
                           <div className="flex-1">
                             <label className="block text-[10px] font-mono text-zinc-400 mb-1">Select Member</label>
                             <select
                               value={selectedStaffByEvent[evId] || ''}
                               onChange={(e) => setSelectedStaffByEvent(prev => ({ ...prev, [evId]: e.target.value }))}
                               className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100"
                             >
                               <option value="">-- Choose Staff member --</option>
                               {staff && staff.filter(s => s.status === 'Active').map(st => (
                                 <option key={st.staff_id} value={st.name}>{st.name} - {st.role}</option>
                               ))}
                             </select>
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               const selectedStaff = selectedStaffByEvent[evId];
                               if (!selectedStaff) return;
                               const memberInfo = staff?.find(st => st.name === selectedStaff);
                               const staffId = memberInfo?.staff_id || 'MOCK-' + Math.random().toString(36).substr(2, 4);
                               
                               setEventAllocations(prev => {
                                 const existingAlloc = prev[evId] || { staff: [] };
                                 if (existingAlloc.staff.some(s => s.staff_name === selectedStaff)) return prev;
                                 return {
                                   ...prev,
                                   [evId]: {
                                     ...existingAlloc,
                                     staff: [...(existingAlloc.staff || []), { staff_role: memberInfo?.role || 'Staff', staff_id: staffId, staff_name: selectedStaff, mobile: memberInfo?.mobile || '' }]
                                   }
                                 };
                               });
                               setSelectedStaffByEvent(prev => ({ ...prev, [evId]: '' }));
                             }}
                             className="px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-bold rounded-lg border border-sky-500/30 transition-all uppercase"
                           >
                             + Add
                           </button>
                        </div>
                        
                        {/* Member Information Panel */}
                        {(() => {
                           const selectedStaff = selectedStaffByEvent[evId];
                           if (!selectedStaff) return null;
                           const memberInfo = staff?.find(st => st.name === selectedStaff);
                           if (!memberInfo) return null;
                           
                           let isConflict = false;
                           let conflictEventName = '';
                           let conflictDate = '';
                           let conflictTime = '';
                           
                           leads?.forEach(l => {
                             l.events?.forEach(e => {
                               if (e.id === evId) return;
                               const assignedNames = e.assigned_staff_names ? e.assigned_staff_names.split(', ') : [];
                               if (assignedNames.includes(selectedStaff)) {
                                 const eDate = l.Reporting_date || e.event_date;
                                 const eTime = e.reporting_time;
                                 if (eDate === allocation.reporting_date && eDate) {
                                   isConflict = true;
                                   conflictEventName = e.event_name || e.event_type || 'Event';
                                   conflictDate = eDate;
                                   conflictTime = eTime || '';
                                 }
                               }
                             });
                           });

                           return (
                             <div className="mt-3 p-3 bg-zinc-900 border border-zinc-750 rounded-lg space-y-2">
                               {isConflict && (
                                 <div className="bg-red-500/10 border border-red-500/30 p-2 rounded text-red-400 text-xs mb-2">
                                   <div className="font-bold flex items-center gap-1">
                                     <span>⚠️</span> This member is already assigned to another event.
                                   </div>
                                   <div className="mt-1 font-mono text-[10px]">
                                     <div>Event: {conflictEventName}</div>
                                     <div>Reporting Date: {conflictDate}</div>
                                     <div>Reporting Time: {conflictTime}</div>
                                   </div>
                                 </div>
                               )}
                               <div className="grid grid-cols-2 gap-2 text-[10px]">
                                 <div>
                                   <span className="text-zinc-500 uppercase font-mono block">Member Name</span>
                                   <span className="text-zinc-200 font-bold">{memberInfo.name}</span>
                                 </div>
                                 <div>
                                   <span className="text-zinc-500 uppercase font-mono block">Skill / Specialization</span>
                                   <span className="text-zinc-200">{memberInfo.role}</span>
                                 </div>
                                 <div>
                                   <span className="text-zinc-500 uppercase font-mono block">Reporting Date</span>
                                   <span className="text-zinc-200">{allocation.reporting_date || 'Not set'}</span>
                                 </div>
                                 <div>
                                   <span className="text-zinc-500 uppercase font-mono block">Reporting Time</span>
                                   <span className="text-zinc-200">{allocation.reporting_time || 'Not set'}</span>
                                 </div>
                                 <div>
                                   <span className="text-zinc-500 uppercase font-mono block">Availability Status</span>
                                   <span className={isConflict ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                     {isConflict ? 'Already Assigned' : 'Available'}
                                   </span>
                                 </div>
                               </div>
                             </div>
                           );
                        })()}
                        `;

content = content.replace(staffUIRegex, staffUINew);

// 6. Update handleAssignSubmit
const handleAssignSubmitOld = `    try {
      setIsSaving(true);
      // First save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, activeAssignments);`;

const handleAssignSubmitNew = `    try {
      setIsSaving(true);

      // Collect ALL assigned staff across all events into activeAssignments so they are recorded correctly
      const allAssignedStaff: { staff_role: string; staff_id: string; staff_name: string }[] = [];
      Object.values(eventAllocations).forEach(alloc => {
        if (alloc.staff && alloc.staff.length > 0) {
          alloc.staff.forEach((st: any) => {
            if (!allAssignedStaff.find(a => a.staff_name === st.staff_name)) {
               allAssignedStaff.push({
                 staff_role: st.staff_role,
                 staff_id: st.staff_id,
                 staff_name: st.staff_name
               });
            }
          });
        }
      });
      
      // Update lead_events table with assigned staff
      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
      if (supabaseClient && matchedOrder?.lead_id) {
         for (const evId of Object.keys(eventAllocations)) {
            const alloc = eventAllocations[evId];
            if (evId !== 'default' && alloc.staff) {
               const staffNames = alloc.staff.map((s: any) => s.staff_name).join(', ');
               const staffMobiles = alloc.staff.map((s: any) => s.mobile || '').join(', ');
               await supabaseClient.from('lead_events')
                  .update({ assigned_staff_names: staffNames, assigned_staff_mobiles: staffMobiles })
                  .eq('id', evId);
            }
         }
      }

      // Save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, allAssignedStaff.length > 0 ? allAssignedStaff : activeAssignments);`;

content = content.replace(handleAssignSubmitOld, handleAssignSubmitNew);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content, 'utf-8');
console.log("Updated OperationsLeads.tsx");
