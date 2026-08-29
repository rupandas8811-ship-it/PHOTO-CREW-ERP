const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

if (!code.includes('import { AddNoteModal }')) {
  code = code.replace(/import \{ createPortal \} from 'react-dom';/, 'import { AddNoteModal } from "./AddNoteModal";\nimport { createPortal } from "react-dom";');
}

if (!code.includes('FileText,')) {
  code = code.replace(/Plus, Edit/, 'FileText, Plus, Edit');
}

if (!code.includes('const [noteModalOpen')) {
  const hooks = `  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalLeadId, setNoteModalLeadId] = useState('');
  const [noteModalOrderId, setNoteModalOrderId] = useState('');
  const [noteModalCustomerName, setNoteModalCustomerName] = useState('');
`;
  code = code.replace(/const \[leads, setLeads\] = useState<Lead\[\]>\(\[\]\);/, hooks + '  const [leads, setLeads] = useState<Lead[]>([]);');
}

if (!code.includes('const isLeadLost =')) {
  code = code.replace(/\{selectedLead && \(\n\s*<div\s*id="lead_details_mobile_modal"/g, '{selectedLead && (() => { const isLeadLost = ["Lead Lost", "Lost Lead"].includes(getLeadCurrentStatus(selectedLead)); return (\n        <div \n          id="lead_details_mobile_modal"');
  code = code.replace(/<AddNoteModal\s*isOpen=\{noteModalOpen\}[^>]*><\/AddNoteModal>/, '');
  code = code.replace(/document\.body\n\s*\)}/, 'document.body\n      )}\n\n      {/* Add Note Modal */}\n      <AddNoteModal\n        isOpen={noteModalOpen}\n        onClose={() => setNoteModalOpen(false)}\n        leadId={noteModalLeadId}\n        orderId={noteModalOrderId}\n        customerName={noteModalCustomerName}\n      />');
  
  // Also we need to close the IIFE for selectedLead
  // The selectedLead modal ends before `{/* Cancel Lead Reason Modal */}` if any, or right before `document.body`?
  // No, the selectedLead modal is inside the portal.
  // Let's replace the end of selectedLead.
}
fs.writeFileSync('src/components/SalesModule.tsx', code);
