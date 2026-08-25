import re

with open('src/components/SalesModule.tsx', 'r') as f:
    text = f.read()

manage_crm_block = '''                              if (isManageCrmOnlyStatus && isActiveInSales && canEdit) {
                                return (
                                  <div className="relative inline-block text-left actions-dropdown-container w-full flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownLeadId === lead.lead_id) {
                                          setOpenDropdownLeadId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const spaceAbove = rect.top;
                                          const menuHeight = 130;
                                          
                                          let top: number | string = rect.bottom + 4;
                                          let bottom: number | string = 'auto';
                                          
                                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                                            top = 'auto';
                                            bottom = window.innerHeight - rect.top + 4;
                                          }
                                          
                                          setDropdownCoords({ top, right: window.innerWidth - rect.right, bottom });
                                          setOpenDropdownLeadId(lead.lead_id);
                                        }
                                      }}
                                      className="w-32 h-8 text-xs font-bold rounded-xl border transition-all cursor-pointer inline-flex items-center justify-between px-3 shadow shrink-0 bg-sky-950/30 hover:bg-sky-900/50 text-sky-400 hover:text-white border-sky-900/50"
                                    >
                                      <span>⚡ Actions</span>
                                      <span className="text-[10px] ml-1">▼</span>
                                    </button>

                                    {openDropdownLeadId === lead.lead_id && createPortal(
                                      <div 
                                        className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                        style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                      >
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setNoteModalLeadId(lead.lead_id);
                                            setNoteModalOrderId('');
                                            setNoteModalCustomerName(lead.customer_name);
                                            setNoteModalOpen(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <FileText className="w-3.5 h-3.5 shrink-0" />
                                          <span>Add Note</span>
                                        </button>
                                        
                                        <button
                                          type="button"
                                          id={`btn_followup_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-sky-950/30 hover:bg-sky-900/50 text-sky-400 hover:text-white rounded-lg border border-sky-900/50 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <Edit className="w-3.5 h-3.5 shrink-0" />
                                          <span>Manage CRM</span>
                                        </button>

                                        <button
                                          type="button"
                                          id={`btn_lost_lead_direct_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setSelectedLead(lead);
                                            setLostReason('');
                                            setOtherLostReason('');
                                            setLostNotes('');
                                            setShowLostModal(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg border border-rose-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <X className="w-3.5 h-3.5 shrink-0" />
                                          <span>Lost Lead</span>
                                        </button>
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                                );
                              }'''

fallback_block = '''                              return (
                                  <div className="relative inline-block text-left actions-dropdown-container w-full flex justify-end">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownLeadId === lead.lead_id) {
                                          setOpenDropdownLeadId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const spaceAbove = rect.top;
                                          const menuHeight = 90;
                                          
                                          let top: number | string = rect.bottom + 4;
                                          let bottom: number | string = 'auto';
                                          
                                          if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                                            top = 'auto';
                                            bottom = window.innerHeight - rect.top + 4;
                                          }
                                          
                                          setDropdownCoords({ top, right: window.innerWidth - rect.right, bottom });
                                          setOpenDropdownLeadId(lead.lead_id);
                                        }
                                      }}
                                      className="w-32 h-8 text-xs font-bold rounded-xl border transition-all cursor-pointer inline-flex items-center justify-between px-3 shadow shrink-0 bg-purple-950/30 hover:bg-purple-900/50 text-purple-400 hover:text-white border-purple-900/50"
                                    >
                                      <span>⚡ Actions</span>
                                      <span className="text-[10px] ml-1">▼</span>
                                    </button>

                                    {openDropdownLeadId === lead.lead_id && createPortal(
                                      <div 
                                        className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                        style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                      >
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setNoteModalLeadId(lead.lead_id);
                                            setNoteModalOrderId('');
                                            setNoteModalCustomerName(lead.customer_name);
                                            setNoteModalOpen(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <FileText className="w-3.5 h-3.5 shrink-0" />
                                          <span>Add Note</span>
                                        </button>
                                        
                                        <button
                                          type="button"
                                          id={`btn_followup_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-purple-950/30 hover:bg-purple-900/50 text-purple-400 hover:text-white rounded-lg border border-purple-900/50 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <Eye className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                                          <span>View CRM</span>
                                        </button>
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                              );'''

pattern = r'if \(isManageCrmOnlyStatus && isActiveInSales && canEdit\) \{.*?(?= \}\)\(\)\})'
replacement = manage_crm_block + '\n\n' + fallback_block

new_text, count = re.subn(pattern, replacement, text, flags=re.DOTALL)

if count > 0:
    with open('src/components/SalesModule.tsx', 'w') as f:
        f.write(new_text)
    print("Replaced successfully")
else:
    print("Pattern not found")

