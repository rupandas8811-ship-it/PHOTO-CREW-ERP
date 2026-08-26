with open("src/components/operations/OperationsLeads.tsx", "r") as f:
    content = f.read()

target = """                                    {/* 4. Equipment Column (Showing assigned equipment) */}
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap relative">
                                      {effectiveAssignedEq.length > 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          <div className="flex flex-wrap items-center justify-center gap-1 max-w-[240px]">
                                            {effectiveAssignedEq.map((gear, gIdx) => (
                                              <span key={gIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold whitespace-nowrap">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                                {gear}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-zinc-500 font-semibold text-xs font-mono">
                                          Not Assigned
                                        </span>
                                      )}
                                    </td>"""

replacement = """                                    {/* 4. Equipment Column (Showing assigned equipment) */}
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap relative">
                                      <EquipmentAssignedCell 
                                        equipmentList={effectiveAssignedEq} 
                                        equipmentStatusText={equipmentStatusText} 
                                      />
                                    </td>"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/operations/OperationsLeads.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
