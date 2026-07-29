import sys

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

target1 = """                              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                <th className="py-2.5 px-3.5 font-bold">Staff Name</th>
                                <th className="py-2.5 px-3.5 font-bold">Mobile Number</th>
                                <th className="py-2.5 px-3.5 font-bold">Assigned Task</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Take</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Handover</th>
                                <th className="py-2.5 px-3.5 font-bold text-right">Staff Status</th>
                              </tr>"""

replacement1 = """                              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                <th className="py-2.5 px-3.5 font-bold">Staff Name</th>
                                <th className="py-2.5 px-3.5 font-bold">Assigned Task</th>
                                <th className="py-2.5 px-3.5 font-bold text-right">Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Taken</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event Start</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Handover</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event End</th>
                              </tr>"""

content = content.replace(target1, replacement1)

target2 = """                                const getPhotoForStatus = (statusKeyword: string) => {
                                  const proof = leadEquipmentHistory?.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    if (!h.equipment_status?.toLowerCase().includes(statusKeyword)) return false;
                                    if (h.returned_by?.toLowerCase() !== member.staff_name.toLowerCase()) return false;
                                    
                                    if (!h.remarks) return false;
                                    try {
                                      const parsed = JSON.parse(h.remarks);
                                      if (parsed.event_name && parsed.event_name !== evName && evName !== 'Main Event' && parsed.event_name !== 'Main Event') {
                                        return false; // Skip if it's explicitly for another event
                                      }
                                      return true;
                                    } catch (e) {
                                      return true; // Fallback for old data without valid JSON
                                    }
                                  });
                                  
                                  if (!proof || !proof.remarks) return null;
                                  try {
                                    const parsed = JSON.parse(proof.remarks);
                                    return parsed.photo_url || null;
                                  } catch (e) {
                                    return null;
                                  }
                                };
                                
                                const takePhoto = getPhotoForStatus('start');
                                const handoverPhoto = getPhotoForStatus('complete');"""

replacement2 = """                                const getPhotoForType = (stageKeyword: string, typeKeyword: string) => {
                                  const proof = leadEquipmentHistory?.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    if (!h.equipment_status?.toLowerCase().includes(stageKeyword)) return false;
                                    if (h.returned_by?.toLowerCase() !== member.staff_name.toLowerCase()) return false;
                                    if (h.equipment_name && !h.equipment_name.toLowerCase().includes(typeKeyword)) return false;
                                    
                                    if (!h.remarks) return false;
                                    try {
                                      const parsed = JSON.parse(h.remarks);
                                      if (parsed.event_name && parsed.event_name !== evName && evName !== 'Main Event' && parsed.event_name !== 'Main Event') {
                                        return false;
                                      }
                                      return true;
                                    } catch (e) {
                                      return true;
                                    }
                                  });
                                  
                                  if (!proof || !proof.remarks) return null;
                                  try {
                                    const parsed = JSON.parse(proof.remarks);
                                    return parsed.photo_url || null;
                                  } catch (e) {
                                    return null;
                                  }
                                };
                                
                                const eqTakePhoto = getPhotoForType('start', 'equipment');
                                const evStartPhoto = getPhotoForType('start', 'event');
                                const eqHandoverPhoto = getPhotoForType('complete', 'equipment');
                                const evEndPhoto = getPhotoForType('complete', 'event');"""

content = content.replace(target2, replacement2)

target3 = """                                  <tr key={mIdx} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="py-3 px-3.5 font-bold text-white font-sans">
                                      {member.staff_name}
                                    </td>
                                    <td className="py-3 px-3.5 font-mono text-zinc-300">
                                      {member.mobile || '—'}
                                    </td>
                                    <td className="py-3 px-3.5 font-sans">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-xs">
                                        {member.assigned_task || member.staff_role}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {takePhoto ? (
                                        <img 
                                          src={takePhoto} 
                                          alt="Take" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(takePhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {handoverPhoto ? (
                                        <img 
                                          src={handoverPhoto} 
                                          alt="Handover" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(handoverPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-right font-mono">
                                      {statusBadge}
                                    </td>
                                  </tr>"""

replacement3 = """                                  <tr key={mIdx} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="py-3 px-3.5 font-bold text-white font-sans">
                                      {member.staff_name}
                                    </td>
                                    <td className="py-3 px-3.5 font-sans">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-xs">
                                        {member.assigned_task || member.staff_role}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-right font-mono">
                                      {statusBadge}
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {eqTakePhoto ? (
                                        <img 
                                          src={eqTakePhoto} 
                                          alt="Take" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(eqTakePhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {evStartPhoto ? (
                                        <img 
                                          src={evStartPhoto} 
                                          alt="EvStart" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(evStartPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {eqHandoverPhoto ? (
                                        <img 
                                          src={eqHandoverPhoto} 
                                          alt="Handover" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(eqHandoverPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {evEndPhoto ? (
                                        <img 
                                          src={evEndPhoto} 
                                          alt="EvEnd" 
                                          className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(evEndPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>
                                  </tr>"""

content = content.replace(target3, replacement3)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

print("Done")
