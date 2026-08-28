const fs = require('fs');
const file = 'src/components/SalesModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `                                        {/* View CRM Option */}`;
const replacement = `                                        {/* Add Note Option */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenDropdownLeadId(null);
                                            setNoteModalLeadId(lead.lead_id);
                                            setNoteModalOrderId(''); // sales leads typically don't have an orderId until confirmed
                                            setNoteModalCustomerName(lead.customer_name);
                                            setNoteModalOpen(true);
                                          }}
                                          className="w-full h-8 px-3 text-xs font-bold bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white rounded-lg border border-blue-900/40 transition-all cursor-pointer flex items-center gap-2 shadow"
                                        >
                                          <FileText className="w-3.5 h-3.5 shrink-0" />
                                          <span>Add Note</span>
                                        </button>
                                        
                                        {/* View CRM Option */}`;
content = content.replace(target, replacement);
fs.writeFileSync(file, content);
