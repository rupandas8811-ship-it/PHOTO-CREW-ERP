const fs = require('fs');
const content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

// Replace table header
const headerTarget = `                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Taken</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event Start</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Handover</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event End</th>`;
const headerReplace = `                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event Image</th>`;

let updated = content.replace(headerTarget, headerReplace);

// We need to replace the getPhotoForType and the 4 columns in the row
const rowLogicTargetStart = `                                const getPhotoForType = (stageKeyword: string, typeKeyword: string) => {`;
const rowLogicTargetEnd = `                                      {evEndPhoto ? (
                                        <img
                                           src={evEndPhoto}
                                           alt="EvEnd"
                                           className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(evEndPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>`;

const startIndex = updated.indexOf(rowLogicTargetStart);
const endIndex = updated.indexOf(rowLogicTargetEnd);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start or end index for row logic");
  process.exit(1);
}

const extractTarget = updated.substring(startIndex, endIndex + rowLogicTargetEnd.length);

const rowLogicReplace = `                                const getRecordForStage = (stage: string) => {
                                  return leadEquipmentHistory?.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    if (h.equipment_status !== stage) return false;
                                    if (h.returned_by?.toLowerCase() !== member.staff_name.toLowerCase()) return false;
                                    if (!h.remarks) return false;
                                    try {
                                      const parsed = JSON.parse(h.remarks);
                                      if (parsed.event_name && parsed.event_name !== evName && evName !== 'Main Event' && parsed.event_name !== 'Main Event') return false;
                                      return true;
                                    } catch (e) { return true; }
                                  });
                                };

                                const eqReceived = getRecordForStage('Equipment Received');
                                const eqHandover = getRecordForStage('Equipment Handover');
                                const evStart = getRecordForStage('Event Start');

                                let equipmentStatusText = 'Pending';
                                if (eqHandover) equipmentStatusText = 'Equipment Handover';
                                else if (eqReceived) equipmentStatusText = 'Equipment Received';

                                const getPhotoUrl = (record: any) => {
                                  if (!record || !record.remarks) return null;
                                  try {
                                    return JSON.parse(record.remarks).photo_url;
                                  } catch (e) { return null; }
                                };

                                const evStartPhoto = getPhotoUrl(evStart);

                                return (
                                  <tr key={mIdx} className="hover:bg-zinc-800/30 transition-colors">
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
                                      <span 
                                        onClick={() => setSelectedEquipmentStatus({ staffName: member.staff_name, eqReceived, eqHandover })}
                                        className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline font-bold text-xs"
                                      >
                                        {equipmentStatusText}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-center">
                                      {evStartPhoto ? (
                                        <img
                                           src={evStartPhoto}
                                           alt="Event Start"
                                           className="w-10 h-10 object-cover rounded-md border border-zinc-700 mx-auto cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(evStartPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-zinc-600 italic text-[10px]">Pending</span>
                                      )}
                                    </td>`;

updated = updated.replace(extractTarget, rowLogicReplace);

// We need to render the popup for selectedEquipmentStatus
const modalInsertTarget = `      {/* Raw Footage Received Modal */}`;
const eqModalCode = `
      {/* Equipment Status Modal */}
      {selectedEquipmentStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-805 rounded-2xl w-full max-w-lg shadow-2xl relative p-5">
            <h3 className="text-sm font-bold text-indigo-400 font-mono uppercase mb-4">
              Equipment Status - {selectedEquipmentStatus.staffName}
            </h3>
            
            <table className="w-full text-left text-sm mb-4">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-2">Verification</th>
                  <th className="py-2 text-center">Image</th>
                  <th className="py-2 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                <tr>
                  <td className="py-3 text-white font-bold text-xs">Equipment Received</td>
                  <td className="py-3 text-center">
                    {selectedEquipmentStatus.eqReceived ? (() => {
                      try {
                        const url = JSON.parse(selectedEquipmentStatus.eqReceived.remarks).photo_url;
                        return url ? (
                           <button onClick={() => window.open(url, '_blank')} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-indigo-400 border border-zinc-700 transition-colors cursor-pointer">View Image</button>
                        ) : <span className="text-zinc-600 italic">No Image</span>;
                      } catch(e) { return null; }
                    })() : <span className="text-zinc-600 italic text-[10px]">Pending/Empty</span>}
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-zinc-400">
                    {selectedEquipmentStatus.eqReceived?.returned_at ? new Date(selectedEquipmentStatus.eqReceived.returned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-white font-bold text-xs">Equipment Handover</td>
                  <td className="py-3 text-center">
                    {selectedEquipmentStatus.eqHandover ? (() => {
                      try {
                        const url = JSON.parse(selectedEquipmentStatus.eqHandover.remarks).photo_url;
                        return url ? (
                           <button onClick={() => window.open(url, '_blank')} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-indigo-400 border border-zinc-700 transition-colors cursor-pointer">View Image</button>
                        ) : <span className="text-zinc-600 italic">No Image</span>;
                      } catch(e) { return null; }
                    })() : <span className="text-zinc-600 italic text-[10px]">Pending/Empty</span>}
                  </td>
                  <td className="py-3 text-right font-mono text-xs text-zinc-400">
                    {selectedEquipmentStatus.eqHandover?.returned_at ? new Date(selectedEquipmentStatus.eqHandover.returned_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedEquipmentStatus(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Footage Received Modal */}`;

updated = updated.replace(modalInsertTarget, eqModalCode);

// Add selectedEquipmentStatus to state
const stateTarget = `  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);`;
const stateReplace = `  const [activeMenuOrderId, setActiveMenuOrderId] = useState<string | null>(null);
  const [selectedEquipmentStatus, setSelectedEquipmentStatus] = useState<{ staffName: string, eqReceived: any, eqHandover: any } | null>(null);`;
updated = updated.replace(stateTarget, stateReplace);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', updated);
console.log("Patched popup");
