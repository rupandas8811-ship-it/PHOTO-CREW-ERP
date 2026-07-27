                                          >
                                            ✔ {roleStr as string}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Right Column: Multi-staff assignments */}
                                      <td className="px-3.5 py-1.5">
                                        <div className="space-y-2">
                                          {assignedToRole.map((assignedStaff: any, rowIdx: number) => {
                                            const currentStaffType = assignedStaff.staff_type || 'In-House';
                                            
                                            return (
                                              <div key={`row_${rowIdx}`} className="flex items-center gap-2">
                                                {/* Staff Type Select */}
                                                <div className="w-32 shrink-0">
                                                  <select
                                                    value={currentStaffType}
                                                    onChange={(e) => {
                                                      const newType = e.target.value as 'In-House' | 'Freelancer';
                                                      
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        let targetIdx = 0;
                                                        const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                          if (s.staff_role === roleStr) {
                                                            if (targetIdx === rowIdx) {
                                                              targetIdx++;
                                                              return {
                                                                ...s,
                                                                staff_type: newType,
                                                                staff_name: '',
                                                                staff_id: '',
                                                                mobile: ''
                                                              };
                                                            }
                                                            targetIdx++;
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-300 rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-7"
                                                  >
                                                    <option value="In-House">In-House</option>
                                                    <option value="Freelancer">Freelancer</option>
                                                  </select>
                                                </div>

                                                {/* Staff Name Select */}
                                                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                                                  <select
                                                    value={assignedStaff.staff_name || ''}
                                                    onChange={(e) => {
                                                      const selectedName = e.target.value;
                                                      const memberInfo = staff?.find(st => st.name === selectedName);
                                                      const staffId = memberInfo?.staff_id || '';
                                                      
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        let targetIdx = 0;
                                                        const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                          if (s.staff_role === roleStr) {
                                                            if (targetIdx === rowIdx) {
                                                              targetIdx++;
                                                              return {
                                                                ...s,
                                                                staff_name: selectedName,
                                                                staff_id: staffId,
                                                                mobile: memberInfo?.mobile || ''
                                                              };
                                                            }
                                                            targetIdx++;
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className={`w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-amber-500 cursor-pointer h-7 ${
                                                      assignedStaff.staff_name ? 'text-emerald-400 font-bold' : 'text-zinc-400 font-normal'
                                                    }`}
                                                  >
                                                    {(() => {
                                                      const normType = (type: string | undefined): string => {
                                                        const clean = (type || 'In-House').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                                                        return (clean === 'inhouse' || clean === 'in-house' || clean === 'in house') ? 'in-house' : 'freelancer';
                                                      };
                                                      
                                                      const filteredStaff = (staff || []).filter(s => {
                                                        if (s.status !== 'Active') return false;
                                                        if (s.department !== 'Operations') return false;
                                                        const sType = s.staff_type || s.Staff_Type;
                                                        return normType(sType) === normType(currentStaffType);
                                                      });
                                                      
                                                      const allStaffInEvent = allocStaff.map((s: any) => s.staff_name).filter(Boolean);
                                                      
                                                      const availableStaff = filteredStaff.filter(s => 
                                                        s.name === assignedStaff.staff_name || 
                                                        !allStaffInEvent.includes(s.name)
                                                      );
                                                      
                                                      if (availableStaff.length === 0) {
                                                        return <option value="" disabled>No staff available.</option>;
                                                      }
                                                      
                                                      return (
                                                        <>
                                                          <option value="">▼ Select Staff</option>
                                                          {availableStaff.map(st => {
                                                            const isBusy = isStaffBusyOnDate(st.name, ev.event_date || '', activeOrderInstance?.order_id || '');
                                                            return (
                                                              <option key={st.staff_id} value={st.name}>
                                                                {st.name} {isBusy ? '🔴 Busy' : '🟢 Available'} - {st.role}
                                                              </option>
                                                            );
                                                          })}
                                                        </>
                                                      );
                                                    })()}
                                                  </select>

                                                  {assignedStaff.staff_name && (
                                                    isStaffBusyOnDate(assignedStaff.staff_name, ev.event_date || '', activeOrderInstance?.order_id || '') ? (
                                                      <button 
                                                        type="button" 
                                                        onClick={() => setBusyRosterStaff(assignedStaff.staff_name)} 
                                                        className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-mono uppercase border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors shrink-0"
                                                      >
                                                        🔴 Busy
                                                      </button>
                                                    ) : (
                                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono uppercase border border-emerald-500/20 shrink-0">
                                                        🟢 Available
                                                      </span>
                                                    )
                                                  )}
                                                </div>

                                                {/* Remove Row Button */}
                                                <div className="w-6 shrink-0 flex justify-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setEventAllocations((prev: any) => {
                                                        const existingAlloc = prev[evId] || { staff: [] };
                                                        
                                                        let targetIdx = 0;
                                                        let updatedStaff = existingAlloc.staff.filter((s: any) => {
                                                          if (s.staff_role === roleStr) {
                                                            if (targetIdx === rowIdx) {
                                                              targetIdx++;
                                                              return false;
                                                            }
                                                            targetIdx++;
                                                          }
                                                          return true;
                                                        });
                                                        
                                                        // Ensure at least one row remains
                                                        const roleStaffRemaining = updatedStaff.filter((s: any) => s.staff_role === roleStr);
                                                        if (roleStaffRemaining.length === 0) {
                                                          updatedStaff.push({
                                                            staff_role: roleStr,
                                                            staff_id: '',
                                                            staff_name: '',
                                                            mobile: '',
                                                            staff_type: 'In-House'
                                                          });
                                                        }
                                                        
                                                        return {
                                                          ...prev,
                                                          [evId]: {
                                                            ...existingAlloc,
                                                            staff: updatedStaff
                                                          }
                                                        };
                                                      });
                                                    }}
                                                    className="text-zinc-600 hover:text-rose-400 transition-colors p-1 cursor-pointer text-xs font-bold"
                                                    title="Remove staff assignment row"
                                                  >
                                                    ✕
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {/* Add Staff Button */}
                                          <div className="pt-1">
                                            <button
