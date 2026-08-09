const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const startTag = '<tbody className="divide-y divide-zinc-900 text-zinc-300 font-sans">';
const endTag = '                </tbody>';

const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const before = content.substring(0, startIdx + startTag.length);
  const after = content.substring(endIdx);
  
  const newMiddle = `
                  {(() => {
                    const list = getAssignedEditorsList(assignedEditorsModalProd);

                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-500 italic font-mono text-xs">
                            No assigned staff or deliverables found for this order.
                          </td>
                        </tr>
                      );
                    }

                    return list.map((ed, idx) => {
                      const linkStr = (assignedEditorsModalProd.edited_drive_link || '').trim();
                      const hasLink = linkStr && (linkStr.startsWith('http://') || linkStr.startsWith('https://') || linkStr.includes('drive.google.com') || linkStr.length > 5);
                      return (
                        <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white mb-0.5">{ed.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                              <span>{ed.role}</span>
                              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                              <span className={ed.type === 'In-House' ? 'text-blue-400' : 'text-amber-400'}>{ed.type}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {ed.deliverables && ed.deliverables.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {ed.deliverables.map((d, i) => (
                                  <span key={i} className="inline-flex w-fit px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-[11px] font-mono font-bold">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic text-xs font-mono">Assigned</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={\`px-2 py-0.5 rounded text-[11px] font-mono font-bold \${
                              ['Completed', 'Editing Completed', 'Editing Complete'].includes(ed.status)
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ['Customer Review', 'Client Review'].includes(ed.status)
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : ['Editing Started', 'In Progress', 'Editing In Progress'].includes(ed.status)
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }\`}>
                              {ed.status || 'Assigned Editor'}
                            </span>
                          </td>
                          <td className="p-3">
                            {hasLink ? (
                              <a
                                href={linkStr.startsWith('http') ? linkStr : \`https://\${linkStr}\`}
                                target="_blank"
                                rel="noopener noreferrer"
                                referrerPolicy="no-referrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 font-bold text-xs transition-colors cursor-pointer"
                                title={linkStr}
                              >
                                <span>View Link</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-zinc-500 italic text-xs font-mono">Not Uploaded</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
`;
  
  fs.writeFileSync('src/components/ProductionModule.tsx', before + newMiddle + after);
  console.log('Successfully replaced modal body');
} else {
  console.log('Tags not found');
}
