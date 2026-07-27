                        {/* Assigned Equipment Section */}
                        {(() => {
                          const searchQuery = equipmentSearchQueryByEvent[evId] || '';
                          const isDropdownOpen = !!isEquipmentDropdownOpenByEvent[evId];
                          const selectedEquipmentNames = allocation.equipment || [];
                          
                          const filteredEquipment = (equipment || []).filter(eq => {
                            const q = searchQuery.toLowerCase();
                            return eq.equipment_name.toLowerCase().includes(q) ||
                                   (eq.category || '').toLowerCase().includes(q) ||
                                   (eq.serial_number || '').toLowerCase().includes(q);
                          });

                          return (
                            <div className="space-y-3 pt-5 border-t border-zinc-800/80">
                              <h4 className="text-[11px] font-mono font-bold uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                                📦 Assigned Equipment (Event-Wise)
                              </h4>
                              
                              {/* Selected equipment tags */}
                              <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-zinc-950 rounded-xl border border-zinc-900">
                                {selectedEquipmentNames.length > 0 ? (
                                  selectedEquipmentNames.map((eqName: string, idx: number) => (
                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-mono font-medium rounded-lg border border-amber-500/20 transition-all">
                                      <span>⚙️ {eqName}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEventAllocations(prev => {
                                            const existing = prev[evId] || { equipment: [] };
                                            return {
                                              ...prev,
                                              [evId]: {
                                                ...existing,
                                                equipment: (existing.equipment || []).filter((name: string) => name !== eqName)
                                              }
                                            };
                                          });
                                        }}
                                        className="text-amber-500 hover:text-amber-400 font-bold ml-1 text-xs cursor-pointer focus:outline-none"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10.5px] text-zinc-500 italic px-1.5 py-1 self-center">
                                    No equipment assigned yet. Select gear from the inventory search list below.
                                  </span>
                                )}
                              </div>

                              {validationAttempted && selectedEquipmentNames.length === 0 && (
                                <div className="pt-0.5">
                                  <span className="text-[10px] text-rose-500 font-mono italic">
                                    ⚠️ Required: Select at least one equipment item
                                  </span>
                                </div>
                              )}

                              {/* Search & Select input dropdown */}
                              <div className="relative">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="🔍 Search and add equipment (e.g. Sony A7IV, Drone DJI Mavic 3)..."
                                    value={searchQuery}
                                    onFocus={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: true }))}
                                    onChange={(e) => setEquipmentSearchQueryByEvent(prev => ({ ...prev, [evId]: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500/50 focus:outline-none rounded-lg py-2 px-3 text-xs text-zinc-100 placeholder-zinc-500"
                                  />
                                  {isDropdownOpen ? (
                                    <button
                                      type="button"
                                      onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: false }))}
                                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-mono font-bold rounded-lg border border-zinc-750 transition-colors cursor-pointer"
                                    >
                                      Close
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setIsEquipmentDropdownOpenByEvent(prev => ({ ...prev, [evId]: true }))}
                                      className="px-3 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 text-xs font-mono font-bold rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                                    >
                                      Browse
                                    </button>
                                  )}
                                </div>

                                {isDropdownOpen && (
                                  <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-850 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-40 scrollbar-thin divide-y divide-zinc-850/60">
                                    {filteredEquipment.length > 0 ? (
                                      filteredEquipment.map((eq) => {
                                        const isAlreadySelected = selectedEquipmentNames.includes(eq.equipment_name);
                                        return (
                                          <div
                                            key={eq.equipment_id}
                                            onClick={() => {
                                              if (isAlreadySelected) {
                                                // Deselect
                                                setEventAllocations(prev => {
                                                  const existing = prev[evId] || { equipment: [] };
                                                  return {
                                                    ...prev,
                                                    [evId]: {
                                                      ...existing,
                                                      equipment: (existing.equipment || []).filter((name: string) => name !== eq.equipment_name)
                                                    }
                                                  };
                                                });
                                              } else {
                                                // Select
                                                setEventAllocations(prev => {
                                                  const existing = prev[evId] || { equipment: [] };
                                                  return {
                                                    ...prev,
                                                    [evId]: {
                                                      ...existing,
                                                      equipment: [...(existing.equipment || []), eq.equipment_name]
                                                    }
                                                  };
                                                });
                                              }
                                            }}
                                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors text-xs text-left ${
                                              isAlreadySelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-zinc-855'
                                            }`}
                                          >
                                            <div className="space-y-0.5">
                                              <div className="font-bold text-white flex items-center gap-1.5">
                                                <span>⚙️ {eq.equipment_name}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase font-mono">
                                                  {eq.category}
                                                </span>
                                              </div>
                                              <div className="text-[10px] text-zinc-500 font-mono">
                                                SN: {eq.serial_number || 'N/A'}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {eq.status === 'Available' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                                  Available
                                                </span>
                                              ) : eq.status === 'Assigned' ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                                  Assigned
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/25">
                                                  {eq.status}
                                                </span>
                                              )}

                                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                                isAlreadySelected ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-700'
