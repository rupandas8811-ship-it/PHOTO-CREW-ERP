import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Select New Status *
                          </label>
                          <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            required
                          >"""

target_end = """                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Completion Date
                          </label>"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx) + len("""                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Completion Date
                          </label>""")

if start_idx == -1 or end_idx == -1:
    print("Could not find close project dropdown.")
    exit(1)

new_content = """                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Update Status *
                          </label>
                          <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            required
                          >
                            <option value="" disabled>Select status...</option>
                            <option value="Editor Assigned">Editor Assigned</option>
                            <option value="Client Review Sent">Client Review</option>
                            <option value="Completed">Project Completed</option>
                            <option value="Project Cancelled">Project Cancelled</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Completion Date
                          </label>"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated close project successfully")
