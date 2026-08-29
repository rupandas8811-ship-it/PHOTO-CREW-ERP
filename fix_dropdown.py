import re

with open("src/components/SalesModuleNew.tsx", "r") as f:
    content = f.read()

# We'll locate the `td` block that renders the actions.
start_marker = r'<td className="p-3\.5 text-right pr-5 w-\[160px\] min-w-max overflow-visible relative">'
end_marker = r'</td>'

# Find the indices of the start and end of this block inside SalesModuleNew.tsx
match_iter = list(re.finditer(start_marker, content))
if len(match_iter) > 0:
    start_idx = match_iter[0].start()
    end_idx = content.find(end_marker, start_idx) + len(end_marker)
    
    # We will replace this entire block with a simplified version that ALWAYS renders the dropdown.
    new_td = """<td className="p-3.5 text-right pr-5 w-[160px] min-w-max overflow-visible relative">
                            {(() => {
                              const isManageCrmOnlyStatus = ['New Lead', 'Follow-up', 'Follow Up', 'Contacted', 'Create Quote', 'Created Quotation'].includes(leadStatus);
                              const isActionsDropdownStatus = ['Quote Sent', 'Quotation Sent', 'Quote Follow-up', 'Negotiation', 'Confirm Order', 'Order Confirmed'].includes(leadStatus) || currentStage !== 'Sales';
                              const isLeadLostStatus = ['Lead Lost', 'Lost Lead'].includes(leadStatus);
                              
                              const latestUnlockRequest = unlockRequests
                                .filter((r: any) => r.lead_id === lead.lead_id || (linkedOrder && r.order_id === linkedOrder.order_id) || ((lead as any).order_id && r.order_id === (lead as any).order_id))
                                .sort((a: any, b: any) => new Date(b.created_at || b.requested_at || "").getTime() - new Date(a.created_at || a.requested_at || "").getTime())[0];
                              const isPendingUnlock = latestUnlockRequest?.status === 'Pending' || latestUnlockRequest?.request_status === 'Pending';
                              const isRejectedUnlock = latestUnlockRequest?.status === 'Rejected' || latestUnlockRequest?.request_status === 'Rejected';
                              const isApprovedUnlock = lead.quotation_locked === false || (
                                lead.quotation_locked !== true && (latestUnlockRequest?.status === 'Approved' || latestUnlockRequest?.request_status === 'Approved')
                              );
                              
                              return (
                                  <div className="relative flex justify-end actions-dropdown-container">
                                    <button
                                      type="button"
                                      id={`btn_actions_confirm_${lead.lead_id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (openDropdownLeadId === lead.lead_id) {
                                          setOpenDropdownLeadId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          const spaceAbove = rect.top;
                                          const menuHeight = 180;
                                          
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
                                      className={`w-36 h-8 text-[11px] font-bold rounded-xl border transition-all cursor-pointer inline-flex items-center justify-between px-2.5 shadow shrink-0 ${
                                        isApprovedUnlock
                                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/40'
                                          : 'bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white border-zinc-850'
                                      }`}
                                    >
                                      <span>{isApprovedUnlock ? '✔ Edit Record' : '⚡ Actions'}</span>
                                      <span className="text-[10px] ml-1">▼</span>
                                    </button>
                                    
                                    {openDropdownLeadId === lead.lead_id && createPortal(
                                      <div 
                                        className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                        style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                      >
                                        {/* ALWAYS SHOW ADD NOTE */}
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
                                        
                                        {/* VIEW / MANAGE CRM */}
                                        <button
                                          type="button"
                                          id={`btn_followup_${lead.lead_id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className={`w-full h-8 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 shadow ${(!isLeadLostStatus && canEdit) ? 'bg-sky-950/30 hover:bg-sky-900/50 text-sky-400 hover:text-white border border-sky-900/50' : 'bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white border border-zinc-850/40'}`}
                                        >
                                          {(!isLeadLostStatus && canEdit) ? <Edit className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
                                          <span>{(!isLeadLostStatus && canEdit) ? 'Manage CRM' : 'View CRM'}</span>
                                        </button>
                                        
                                        {/* CONFIRM ORDER */}
                                        {isActionsDropdownStatus && leadStatus !== 'Order Confirmed' && leadStatus !== 'Order Close' && currentStage === 'Sales' && (
                                          <button
                                            type="button"
                                            id={`btn_confirm_order_direct_${lead.lead_id}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                              const today = new Date().toISOString().split('T')[0];
                                              const linkedOrder = orders?.find(o => o.lead_id === lead.lead_id);
                                              const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
                                              const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(lead.advance_collected) || 0));
                                              setConfirmForm({
                                                ...confirmForm,
                                                package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || '',
                                                quotation_amount: Number(lead.Final_Quotation_Amount) || Number((lead as any).final_quotation_amount) || Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number((lead as any).final_amount) || (lead.lead_id === selectedLead?.lead_id ? Number(wizardLeadData.final_amount) : 0) || 0,
                                                advance_received: calcAdvance,
                                                event_date: lead.event_date || today,
                                                event_time: lead.event_time || ''
                                              });
                                              initEventsReporting(lead);
                                              setShowConfirmModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white rounded-lg border border-emerald-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                            <span>Confirm Order</span>
                                          </button>
                                        )}
                                        
                                        {/* UNLOCK QUOTATION (if pending/rejected) */}
                                        {(!isApprovedUnlock && !isPendingUnlock && lead.quotation_locked) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedUnlockLead(lead);
                                              setUnlockRequestReason('Customer requested additional discount');
                                              setUnlockRequestCustomReason('');
                                              setShowUnlockRequestModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-amber-950 hover:bg-amber-900 text-amber-400 hover:text-white rounded-lg border border-amber-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Ban className="w-3.5 h-3.5 shrink-0" />
                                            <span>Unlock Quotation</span>
                                          </button>
                                        )}
                                        
                                        {/* LOST LEAD */}
                                        {!isLeadLostStatus && leadStatus !== 'Order Confirmed' && leadStatus !== 'Order Close' && (
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
                                        )}
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                              );
                            })()}
                          </td>"""
    
    content = content[:start_idx] + new_td + content[end_idx:]

with open("src/components/SalesModuleNew.tsx", "w") as f:
    f.write(content)
