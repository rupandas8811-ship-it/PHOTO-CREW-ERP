import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const thTarget = `                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Payment Status</th>`;

const thReplace = `                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Next Follow-up Date</th>
                    <th className="p-3.5">Follow-up Notes</th>
                    <th className="p-3.5">Payment Status</th>`;

content = content.replace(thTarget, thReplace);

const tdTarget = `                          <td className="p-3.5">
                            <StatusText status={leadStatus} />
                          </td>
                          <td className="p-3.5">
                            <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${`;

const tdReplace = `                          <td className="p-3.5">
                            <StatusText status={leadStatus} />
                          </td>
                          <td className="p-3.5 font-mono text-zinc-350">
                            {lead.Next_Follow_up_Date ? lead.Next_Follow_up_Date : 'N/A'}
                          </td>
                          <td className="p-3.5 text-zinc-400 max-w-[150px] truncate" title={lead["Follow-up_Notes"] || ''}>
                            {lead["Follow-up_Notes"] ? lead["Follow-up_Notes"] : 'N/A'}
                          </td>
                          <td className="p-3.5">
                            <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${\``;

content = content.replace(tdTarget, tdReplace);

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Patched leads table");
