import re

with open("src/components/ProductionModule.tsx", "r") as f:
    content = f.read()

target_start = """                  {/* Editor Contact details input */}"""
target_end = """            {/* Footer */}"""

start_idx = content.find(target_start)
end_idx = content.find(target_end, start_idx)

if start_idx == -1 or end_idx == -1:
    print("Could not find section.")
    exit(1)

new_content = """                  <div className="space-y-4">
                    {editorWhatsappData.editors.map((ed, idx) => (
                      <div key={idx} className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-xl space-y-4 text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider block">Assigned Editor</span>
                            <span className="text-xs font-bold text-zinc-200 block">{ed.name}</span>
                          </div>
                          <div className="md:w-72 space-y-1.5">
                            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">
                              WhatsApp Contact Number {!ed.phone.trim() && <span className="text-rose-500">(Required)</span>}
                            </label>
                            <input
                              type="text"
                              value={ed.phone}
                              onChange={(e) => {
                                const newPhone = e.target.value;
                                setEditorWhatsappData(prev => {
                                  if (!prev) return null;
                                  const newEditors = [...prev.editors];
                                  newEditors[idx] = { ...newEditors[idx], phone: newPhone };
                                  return { ...prev, editors: newEditors };
                                });
                              }}
                              placeholder="e.g. +65 8123 4567"
                              className={`w-full bg-zinc-950 border text-xs text-zinc-200 rounded-xl px-3 py-2 font-mono focus:outline-none ${
                                !ed.phone.trim()
                                  ? 'border-rose-500/50 focus:border-rose-500' 
                                  : 'border-zinc-900 hover:border-zinc-850 focus:border-emerald-500'
                              }`}
                            />
                          </div>
                        </div>
                        {!ed.phone.trim() && (
                          <p className="text-[10px] text-rose-400 font-mono">⚠️ No mobile number saved. Please enter number before sharing.</p>
                        )}
                        <div className="space-y-2 text-left pt-2 border-t border-zinc-900/50">
                          <span className="text-[10px] text-emerald-400 font-black tracking-widest font-mono uppercase block">
                            Message Preview
                          </span>
                          <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-900 select-all overflow-x-auto max-h-[30vh]">
                            {ed.message}
                          </pre>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={!ed.phone.trim()}
                            onClick={() => {
                              const formattedPhone = formatSingaporeWhatsAppNumber(ed.phone);
                              const encodedMsg = encodeURIComponent(ed.message);
                              const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                          >
                            💬 Share with {ed.name}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
"""

updated = content[:start_idx] + new_content + content[end_idx:]

with open("src/components/ProductionModule.tsx", "w") as f:
    f.write(updated)
print("Updated UI successfully")
