import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """                        <td className="py-4 px-6">
                          {b.equipmentItems && b.equipmentItems.length > 0 ? (
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                                {b.equipmentItems.map((e: any, eIdx: number) => (
                                  <span key={eIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono whitespace-nowrap">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    {e.name}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[10px] text-emerald-500/80 font-mono font-bold">
                                {proofStatus.isHandoverComplete ? '✅ Handed Over' : proofStatus.assetImageUploaded ? '✅ Received' : 'Assigned'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-xs font-bold font-mono">
                              Not Assigned
                            </span>
                          )}
                        </td>"""

replacement = """                        <td className="py-4 px-6">
                          <StaffEquipmentDetailsCell b={b} proofStatus={proofStatus} />
                        </td>"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced equipment cell")
else:
    print("Target not found. Let's try regex.")
    
with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)

