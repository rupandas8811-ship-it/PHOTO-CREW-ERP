import re

with open('src/components/SalesModule.tsx', 'r') as f:
    lines = f.readlines()

new_block = '''                                        {/* Add Note Option */}
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            handleSelectLead(lead);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-white rounded-lg border border-zinc-850/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <Eye className="w-3.5 h-3.5 shrink-0" />
                                          <span>View CRM</span>
                                        </button>
'''

lines = lines[:11997] + [new_block] + lines[12037:]

with open('src/components/SalesModule.tsx', 'w') as f:
    f.writelines(lines)

