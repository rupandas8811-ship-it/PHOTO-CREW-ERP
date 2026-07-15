import re

with open("src/components/operations/OperationsLeads.tsx", "r") as f:
    content = f.read()

target = "roster.length = 0; uniqueRosterStr.map(s => roster.push(JSON.parse(s)));"

start_idx = content.find(target)

if start_idx != -1:
    end_idx = content.find("{roster.length === 0 ? (", start_idx)
    if end_idx != -1:
        replacement = """
        return createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-300">
                    {busyRosterStaff.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-0.5">Staff Member Assignments</span>
                    <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
                      {busyRosterStaff}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBusyRosterStaff(null)}
                  className="text-zinc-500 hover:text-white font-bold cursor-pointer transition-colors p-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {roster.length === 0 ? ("""
        
        new_content = content[:start_idx + len(target)] + replacement + content[end_idx + len("{roster.length === 0 ? ("):]
        with open("src/components/operations/OperationsLeads.tsx", "w") as f:
            f.write(new_content)
        print("Fixed syntax")
else:
    print("Could not find target")
