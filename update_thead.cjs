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

if (code.includes(tableHeader)) {
  code = code.replace(tableHeader, newTableHeader);
  fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
  console.log("Replaced thead successfully!");
} else {
  console.log("Could not find table header to replace");
}
