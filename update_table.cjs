const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const tableHeader = `                            <thead>
                              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                <th className="py-2.5 px-3.5 font-bold">Staff Name</th>
                                <th className="py-2.5 px-3.5 font-bold">Assigned Task</th>
                                <th className="py-2.5 px-3.5 font-bold text-right">Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event Image</th>
                              </tr>
                            </thead>`;

const newTableHeader = `                            <thead>
                              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                                <th className="py-2.5 px-3.5 font-bold">Staff Name</th>
                                <th className="py-2.5 px-3.5 font-bold">Assigned Task</th>
                                <th className="py-2.5 px-3.5 font-bold text-right">Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Equipment Status</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Event Image</th>
                                <th className="py-2.5 px-3.5 font-bold text-center">Raw Footage</th>
                              </tr>
                            </thead>`;

code = code.replace(tableHeader, newTableHeader);

const oldRowLogic = `                                const evStartPhoto = getPhotoUrl(evStart);

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
                                          className="h-8 w-12 object-cover rounded border border-zinc-700 cursor-pointer hover:border-indigo-500 transition-colors mx-auto"
                                          onClick={() => window.open(evStartPhoto, '_blank')}
                                        />
                                      ) : (
                                        <span className="text-[10px] text-zinc-500 italic">No Photo</span>
                                      )}
                                    </td>
                                  </tr>
                                );`;

const newRowLogic = `                                const evStartPhoto = getPhotoUrl(evStart);
                                
                                const formatDateTime = (dateStr: string) => {
                                  if (!dateStr) return null;
                                  try {
                                    const d = new Date(dateStr);
                                    const datePart = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\\//g, '-');
                                    const timePart = d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                                    return (
                                      <div className="flex flex-col text-[10px] text-zinc-400 mt-1 leading-tight">
                                        <span>{datePart}</span>
                                        <span>{timePart}</span>
                                      </div>
                                    );
                                  } catch (e) {
                                    return <div className="text-[10px] text-zinc-400 mt-1">{dateStr}</div>;
                                  }
                                };

                                const getRawFootageForMember = () => {
                                  const rfs = rawFootage?.filter(f => f.order_id === ord.order_id) || [];
                                  let match = rfs.find(f => f.uploaded_by?.toLowerCase() === member.staff_name.toLowerCase());
                                  if (match && match.server_path) return match;
                                  match = rfs.find(f => f.uploaded_by?.toLowerCase() === evName.toLowerCase());
                                  if (match && match.server_path) return match;
                                  return null;
                                };
                                const rfMatch = getRawFootageForMember();

                                return (
                                  <tr key={mIdx} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="py-3 px-3.5 font-bold text-white font-sans align-top">
                                      {member.staff_name}
                                    </td>
                                    <td className="py-3 px-3.5 font-sans align-top">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-xs">
                                        {member.assigned_task || member.staff_role}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3.5 text-right font-mono align-top">
                                      {statusBadge}
                                    </td>
                                    <td className="py-3 px-3.5 text-center align-top">
                                      <span 
                                        onClick={() => {
                                          if (eqReceived || eqHandover) {
                                            setSelectedEquipmentStatus({ staffName: member.staff_name, eqReceived, eqHandover });
                                          }
                                        }}
                                        className={\`font-bold text-xs \${(eqReceived || eqHandover) ? 'cursor-pointer text-indigo-400 hover:text-indigo-300 underline' : 'text-zinc-400'}\`}
                                      >
                                        {equipmentStatusText}
                                      </span>
                                      {eqHandover ? formatDateTime(eqHandover.returned_at || eqHandover.created_at) : (eqReceived ? formatDateTime(eqReceived.returned_at || eqReceived.created_at) : null)}
                                    </td>
                                    <td className="py-3 px-3.5 text-center align-top">
                                      {evStartPhoto ? (
                                        <div className="flex flex-col items-center">
                                          <a href={evStartPhoto} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline font-bold text-xs">
                                            View Event Start Image
                                          </a>
                                          {formatDateTime(evStart?.returned_at || evStart?.created_at)}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-zinc-500 font-bold">Pending</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center align-top">
                                      {rfMatch ? (
                                        <div className="flex flex-col items-center">
                                          <a href={rfMatch.server_path} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline font-bold text-xs">
                                            View Raw Footage
                                          </a>
                                          {formatDateTime(rfMatch.uploaded_date || rfMatch.event_completed_date)}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-zinc-500 font-bold">Pending</span>
                                      )}
                                    </td>
                                  </tr>
                                );`;

if (code.includes(tableHeader)) {
  if (code.includes('const evStartPhoto = getPhotoUrl(evStart);')) {
    code = code.replace(oldRowLogic, newRowLogic);
    fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
    console.log("Patched table successfully!");
  } else {
    console.log("Could not find old row logic");
  }
} else {
  console.log("Could not find table header");
}
