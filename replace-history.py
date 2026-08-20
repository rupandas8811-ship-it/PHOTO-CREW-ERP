import re

with open('src/components/AddNoteModal.tsx', 'r') as f:
    content = f.read()

target = """                  return (
                    <div key={h.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 flex flex-col gap-1">
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans mb-1">
                        {h.remarks}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Date: {displayDate}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Time: {displayTime}
                      </div>
                    </div>
                  );"""

replacement = """                  return (
                    <div key={h.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 flex flex-col gap-1">
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed mb-1">
                        {h.remarks}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Date: {displayDate}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Time: {displayTime}
                      </div>
                    </div>
                  );"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/AddNoteModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced history")
else:
    print("Target not found")
