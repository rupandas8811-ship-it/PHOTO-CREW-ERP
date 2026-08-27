const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/SalesModule.tsx');
let text = fs.readFileSync(filePath, 'utf8');

// We locate the start and end of our target block
const startStr = `<td className="p-3.5 text-right pr-5 w-[160px] min-w-max overflow-visible relative">`;
const endStr = `                          </td>`;

const startIndex = text.indexOf(startStr);
if (startIndex === -1) {
  console.error("Could not find start index in SalesModule.tsx");
  process.exit(1);
}

// Find the corresponding closing </td>.
// Since the start block is nested in <tr>, we want to find the first </td> after startIndex
const tdCloseIndex = text.indexOf('</td>', startIndex);
if (tdCloseIndex === -1) {
  console.error("Could not find closing </td> after start index");
  process.exit(1);
}

// We want to replace from after startStr to before </td> with our new dropdown rendering IIFE
const replaceStart = startIndex + startStr.length;
const replaceEnd = tdCloseIndex;

const newContent = `
                            {(() => {
                              const isLeadLostStatus = ['Lead Lost', 'Lost Lead'].includes(leadStatus);

                              if (isLeadLostStatus) {
                                return (
                                  <button
                                    type="button"
                                    id={\`btn_followup_\${lead.lead_id}\`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectLead(lead);
                                    }}
                                    className="w-32 h-8 text-xs font-bold bg-purple-950/30 hover:bg-purple-900/50 text-purple-400 hover:text-white rounded-xl border border-purple-900/50 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                                    <span>View CRM</span>
                                  </button>
                                );
                              }

                              // Determine our 4 requested stages:
                              const isQuoteSentStage = ['Quote Sent', 'Quotation Sent', 'Quote Follow-up', 'Negotiation'].includes(leadStatus);
                              const isConfirmedStage = ['Confirm Order', 'Order Confirmed', 'Event Scheduled', 'Event Started', 'Event Completed'].includes(leadStatus) || ['Operations', 'Production', 'Post-Production', 'Completed'].includes(currentStage);
                              const isOrderCloseStage = ['Order Closed', 'Order Close', 'Closed'].includes(leadStatus);
                              const isInitialSalesStage = !isQuoteSentStage && !isConfirmedStage && !isOrderCloseStage;

                              // Check permission
                              if (!canEdit) {
                                return (
                                  <button
                                    type="button"
                                    id={\`btn_followup_\${lead.lead_id}\`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectLead(lead);
                                    }}
                                    className="w-32 h-8 text-xs font-bold bg-purple-950/30 hover:bg-purple-900/50 text-purple-400 hover:text-white rounded-xl border border-purple-900/50 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow shrink-0"
                                  >
                                    <Eye className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                                    <span>View CRM</span>
                                  </button>
                                );
                              }

                              // Render the standard "⚡ Actions" dropdown
                              return (
                                <div className="relative inline-block text-left actions-dropdown-container">
                                  <button
                                    type="button"
                                    id={\`btn_actions_\${lead.lead_id}\`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openDropdownLeadId === lead.lead_id) {
                                        setOpenDropdownLeadId(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const spaceAbove = rect.top;
                                        const menuHeight = 170;
                                        
                                        let top = rect.bottom + 4;
                                        let bottom = "auto";
                                        
                                        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                                          top = "auto";
                                          bottom = window.innerHeight - rect.top + 4;
                                        }
                                        
                                        setDropdownCoords({ top, right: window.innerWidth - rect.right, bottom });
                                        setOpenDropdownLeadId(lead.lead_id);
                                      }
                                    }}
                                    className="w-32 h-8 text-xs font-bold rounded-xl border transition-all cursor-pointer inline-flex items-center justify-between px-3 shadow shrink-0 bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white border-zinc-850"
                                  >
                                    <span>⚡ Actions</span>
                                    <span className="text-[10px] ml-1">▼</span>
                                  </button>

                                  {openDropdownLeadId === lead.lead_id && createPortal(
                                    <div 
                                      className="fixed w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-[9999] p-1.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100 text-left actions-dropdown-menu"
                                      style={{ top: dropdownCoords.top, right: dropdownCoords.right, bottom: dropdownCoords.bottom }}
                                    >
                                      {/* 1. INITIAL SALES STAGE: Add Note, Manage CRM, Lost Lead */}
                                      {isInitialSalesStage && (
                                        <>
                                          {/* Add Note */}
                                          <button
                                            type="button"
                                            id={\`btn_add_note_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setNoteModalLeadId(lead.lead_id);
                                              setNoteModalOrderId(linkedOrder?.order_id || (lead as any).order_id || "");
                                              setNoteModalCustomerName(lead.customer_name);
                                              setNoteModalOpen(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                            <span>Add Note</span>
                                          </button>

                                          {/* Manage CRM */}
                                          <button
                                            type="button"
                                            id={\`btn_manage_crm_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 hover:text-white rounded-lg border border-sky-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Edit className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                                            <span>Manage CRM</span>
                                          </button>

                                          {/* Lost Lead */}
                                          <button
                                            type="button"
                                            id={\`btn_lost_lead_direct_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedLead(lead);
                                              setLostReason("");
                                              setOtherLostReason("");
                                              setLostNotes("");
                                              setShowLostModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg border border-rose-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            <span>Lost Lead</span>
                                          </button>
                                        </>
                                      )}

                                      {/* 2. QUOTE SENT: Confirm Order, Manage CRM, Lost Lead */}
                                      {isQuoteSentStage && (
                                        <>
                                          {/* Confirm Order */}
                                          <button
                                            type="button"
                                            id={\`btn_confirm_order_dropdown_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedLead(lead);
                                              const today = new Date().toISOString().split("T")[0];
                                              const linkedOrder = orders?.find(o => o.lead_id === lead.lead_id);
                                              const linkedPayment = linkedOrder ? payments?.find(p => p.order_id === linkedOrder.order_id) : null;
                                              const calcAdvance = linkedPayment ? ((linkedPayment.advance_received || 0) + (linkedPayment.final_payment_received || 0)) : (linkedOrder ? (linkedOrder.advance_received || 0) : (Number(lead.advance_collected) || (wizardLeadData ? Number(wizardLeadData.advance_received) : 0) || 0));
                                              
                                              setConfirmForm({
                                                ...confirmForm,
                                                package_name: packages?.find((p) => String(p.package_id) === String(lead.Select_Package_Option))?.package_name || lead.Select_Package_Option || "",
                                                quotation_amount: Number(lead.Final_Package_Amount) || Number((lead as any).final_package_amount) || Number(lead.Final_Quotation_Amount) || Number((lead as any).final_amount) || (wizardLeadData ? Number(wizardLeadData.final_amount) : 0) || 0,
                                                advance_received: calcAdvance,
                                                event_date: lead.event_date || today,
                                                event_time: lead.event_time || ""
                                              });
                                              initEventsReporting(lead);
                                              setShowConfirmModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 hover:text-white rounded-lg border border-emerald-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                            <span>Confirm Order</span>
                                          </button>

                                          {/* Manage CRM */}
                                          <button
                                            type="button"
                                            id={\`btn_manage_crm_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-sky-950/40 hover:bg-sky-900/60 text-sky-400 hover:text-white rounded-lg border border-sky-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Edit className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                                            <span>Manage CRM</span>
                                          </button>

                                          {/* Lost Lead */}
                                          <button
                                            type="button"
                                            id={\`btn_lost_lead_direct_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setSelectedLead(lead);
                                              setLostReason("");
                                              setOtherLostReason("");
                                              setLostNotes("");
                                              setShowLostModal(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-rose-950 hover:bg-rose-900 text-rose-400 hover:text-white rounded-lg border border-rose-900/30 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            <span>Lost Lead</span>
                                          </button>
                                        </>
                                      )}

                                      {/* 3 & 4. CONFIRM ORDER / ORDER CONFIRMED and ORDER CLOSE: View CRM, Add Note */}
                                      {(isConfirmedStage || isOrderCloseStage) && (
                                        <>
                                          {/* View CRM */}
                                          <button
                                            type="button"
                                            id={\`btn_view_crm_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              handleSelectLead(lead);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-lg border border-zinc-850/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <Eye className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                            <span>View CRM</span>
                                          </button>

                                          {/* Add Note */}
                                          <button
                                            type="button"
                                            id={\`btn_add_note_\${lead.lead_id}\`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownLeadId(null);
                                              setNoteModalLeadId(lead.lead_id);
                                              setNoteModalOrderId(linkedOrder?.order_id || (lead as any).order_id || "");
                                              setNoteModalCustomerName(lead.customer_name);
                                              setNoteModalOpen(true);
                                            }}
                                            className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                          >
                                            <FileText className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                            <span>Add Note</span>
                                          </button>
                                        </>
                                      )}
                                    </div>,
                                    document.body
                                  )}
                                </div>
                              );
                            })()}
`;

const result = text.substring(0, replaceStart) + newContent + text.substring(replaceEnd);
fs.writeFileSync(filePath, result, 'utf8');
console.log("Successfully patched SalesModule.tsx!");
