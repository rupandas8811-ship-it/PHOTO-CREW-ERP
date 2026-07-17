import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """                              {/* Dropdown status transition select */}"""
target_end = """                                </div>
                              )}"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx) + len("""                                </div>
                              )}""")

if start_idx == -1 or end_idx == -1:
    print("Could not find dropdown section 1.")
    exit(1)

new_content = """                              {/* Dropdown status transition select */}
                              {displayStatus !== 'Raw Footage Received' && displayStatus !== 'Completed' && (
                                <div className="w-full max-w-[160px]">
                                  <label className="block text-[8px] uppercase tracking-wider text-zinc-500 font-bold mb-1 text-left">
                                    Update Status:
                                  </label>
                                  <select
                                    value={displayStatus}
                                    onChange={async (e) => {
                                      const val = e.target.value;
                                      if (val === displayStatus) return;
                                      try {
                                        setIsSaving(true);
                                        const updates: any = {
                                          editing_status: val,
                                        };
                                        if (val === 'Project Delivered' || val === 'Completed') {
                                          updates.delivery_date = new Date().toISOString().split('T')[0];
                                        }
                                        await updateProduction(prod.production_id, updates);
                                      } catch (err: any) {
                                        alert("Failed to update status: " + (err.message || err));
                                      } finally {
                                        setIsSaving(false);
                                      }
                                    }}
                                    disabled={isSaving}
                                    className="w-full text-zinc-100 bg-zinc-950 border border-zinc-800 hover:border-zinc-750 text-[10.5px] font-sans font-medium py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                                  >
                                    <option value={displayStatus} disabled>
                                      {displayStatus === 'Client Review Sent' ? 'Client Review' : displayStatus === 'Completed' ? 'Project Completed' : displayStatus}
                                    </option>
                                    <option value="Editor Assigned">Editor Assigned</option>
                                    <option value="Client Review Sent">Client Review</option>
                                    <option value="Completed">Project Completed</option>
                                    <option value="Project Cancelled">Project Cancelled</option>
                                  </select>
                                </div>
                              )}"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated inline dropdown successfully")
