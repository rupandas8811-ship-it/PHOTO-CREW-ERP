with open("src/components/SalesModule.tsx", "r") as f:
    content = f.read()

# Add states for AddNoteModal
if "isAddNoteModalOpen" not in content:
    content = content.replace("const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);", 
    "const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);\n  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);\n  const [noteLeadId, setNoteLeadId] = useState('');\n  const [noteCustomerName, setNoteCustomerName] = useState('');")

# Add Add Note button inside actions column
action_col = """<button onClick={() => handleSelectLead(lead)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">View &rarr;</button>"""
new_action_col = """<div className="flex justify-end gap-2">
                                <button onClick={() => { setNoteLeadId(lead.lead_id); setNoteCustomerName(lead.customer_name); setIsAddNoteModalOpen(true); }} className="text-slate-400 hover:text-blue-400" title="Add Note">
                                  <FileText className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleSelectLead(lead)} className="text-blue-400 hover:text-blue-300 text-sm font-medium">View &rarr;</button>
                              </div>"""
content = content.replace(action_col, new_action_col)

# Add Modal
modal_placeholder = """{/* Modals placeholders */}"""
modals = """{/* Modals placeholders */}
      <AddNoteModal 
        isOpen={isAddNoteModalOpen} 
        onClose={() => setIsAddNoteModalOpen(false)} 
        leadId={noteLeadId} 
        customerName={noteCustomerName} 
      />"""
content = content.replace(modal_placeholder, modals)

with open("src/components/SalesModule.tsx", "w") as f:
    f.write(content)
