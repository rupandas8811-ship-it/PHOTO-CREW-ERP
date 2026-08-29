const fs = require('fs');
const file = 'src/components/ProductionModule.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
if (!content.includes('AddNoteModal')) {
  content = content.replace("import { StatusText }", "import { AddNoteModal } from './AddNoteModal';\nimport { StatusText }");
}

// Add state
if (!content.includes('noteModalOpen')) {
  const stateTarget = `const [openActionDropdown, setOpenActionDropdown] = useState`;
  const stateReplacement = stateTarget + `<any>(null);\n  const [noteModalOpen, setNoteModalOpen] = useState(false);\n  const [noteModalLeadId, setNoteModalLeadId] = useState('');\n  const [noteModalOrderId, setNoteModalOrderId] = useState('');\n  const [noteModalCustomerName, setNoteModalCustomerName] = useState('');\n  const [dummyVar, setDummyVar] = useState`;
  content = content.replace(stateTarget, stateReplacement);
}

// Add note logic
if (!content.includes("Add Note</span>")) {
  const noteTarget = `{/* Send Review Link */}`;
  const noteReplacement = `{/* Add Note */}
                      <button
                        type="button"
                        onClick={() => {
                          setOpenActionDropdown(null);
                          setNoteModalLeadId(order?.lead_id || '');
                          setNoteModalOrderId(order?.order_id || '');
                          setNoteModalCustomerName(order?.customer_name || '');
                          setNoteModalOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-blue-300 hover:text-white hover:bg-blue-600/25 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Add Note</span>
                      </button>
                      
                      {/* Send Review Link */}`;
  content = content.replace(noteTarget, noteReplacement);
}

// Add component
if (!content.includes('<AddNoteModal')) {
  const componentTarget = `return (
    <div className="w-full max-w-[100vw] overflow-x-hidden p-2 sm:p-4 pb-24 space-y-6">`;
  const componentReplacement = `return (
    <div className="w-full max-w-[100vw] overflow-x-hidden p-2 sm:p-4 pb-24 space-y-6">
      <AddNoteModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        leadId={noteModalLeadId}
        orderId={noteModalOrderId}
        customerName={noteModalCustomerName}
      />\n`;
  content = content.replace(componentTarget, componentReplacement);
}

fs.writeFileSync(file, content);
