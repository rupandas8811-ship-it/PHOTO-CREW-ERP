const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const targetUI = `                    <p className="text-[11px] text-zinc-400 mb-2">
                      Assign one editor for each deliverable and specify the target delivery date.
                    </p>
                    {wfError && (
                      <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                        ⚠️ {wfError}
                      </div>
                    )}
                    
                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2">`;

const replacementUI = `                    <p className="text-[11px] text-zinc-400 mb-2">
                      Assign one editor for each deliverable and specify the target delivery date.
                    </p>
                    {wfError && (
                      <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                        ⚠️ {wfError}
                      </div>
                    )}
                    
                    {activeWorkflowProd.all_events && activeWorkflowProd.all_events.length > 1 && (
                      <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2 mb-4">
                        <label className="block text-[10px] font-mono text-[#a78bfa] uppercase font-bold tracking-widest">
                          Select Event to Assign *
                        </label>
                        <select
                          value={wfSelectedEventId || ''}
                          onChange={(e) => {
                            setWfSelectedEventId(e.target.value);
                            loadAssignmentsForEvent(activeWorkflowProd, e.target.value);
                          }}
                          className="w-full bg-zinc-950 border border-zinc-900 text-xs rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          {activeWorkflowProd.all_events.map((evt: any) => (
                            <option key={evt.id} value={evt.id}>
                              {evt.event_name || evt.event_type} — {evt.event_date || 'No Date'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2">`;

if (content.includes(targetUI)) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(targetUI, replacementUI));
  console.log("Successfully patched event UI!");
} else {
  console.log("Target not found!");
}
