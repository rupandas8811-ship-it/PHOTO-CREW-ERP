import re

with open('src/components/AddNoteModal.tsx', 'r') as f:
    content = f.read()

target = """                  return (
                    <div key={h.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3">
                      <div className="flex justify-between items-start mb-2 border-b border-zinc-800/50 pb-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500/80 font-mono">
                          <Clock className="w-3 h-3" />
                          {displayDate} | {displayTime}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                          <User className="w-3 h-3" />
                          {h.changed_by}
                        </div>
                      </div>
                      <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {h.remarks}
                      </div>
                    </div>
                  );"""

replacement = """                  return (
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

if target in content:
    content = content.replace(target, replacement)
    with open('src/components/AddNoteModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced AddNoteModal")
else:
    print("Target not found in AddNoteModal")
