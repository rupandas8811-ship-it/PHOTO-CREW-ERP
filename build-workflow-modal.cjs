const fs = require('fs');

const states = fs.readFileSync('/tmp/workflow_states.txt', 'utf8');
const handlers = fs.readFileSync('/tmp/workflow_handlers.txt', 'utf8');
  const goodHandler = `const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {\n    setWfEventSections(prev => {\n      const updated = [...prev];\n      const section = { ...updated[sectionIndex] };\n      const items = [...section.items];\n      items[itemIndex] = { ...items[itemIndex], editor: editorName };\n      section.items = items;\n      updated[sectionIndex] = section;\n      return updated;\n    });\n  };`;
  const fixedHandlers = handlers.replace('const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {', goodHandler);
let modal = fs.readFileSync('/tmp/workflow_modal.txt', 'utf8');

let wpIndex = modal.indexOf('{/* ASSIGNED EDITORS / TEAM POPUP */}');
if (wpIndex !== -1) {
  modal = modal.substring(0, wpIndex);
}

// Ensure the closing braces match perfectly. The original ended with:
//         })()}
// So we don't need to do any string replacement on modal at all!

const componentStart = `import React, { useState, useEffect } from 'react';
import { supabaseClient } from '../../supabaseClient';
import { CheckCircle2, AlertCircle, Eye, Link as LinkIcon, FileText, Download, Check, Sparkles, UserCheck } from 'lucide-react';
import { formatINR } from '../../utils';
import { motion, AnimatePresence } from 'motion/react';

export const ProductionWorkflowModal = ({
  activeWorkflowProd,
  workflowActionType,
  setWorkflowActionType,
  setActiveWorkflowProd,
  orders = [],
  leads = [],
  quotations = [],
  editorAssignments = [],
  productionStaff = [],
  operationsList = [],
  rawFootage = [],
  logs = [],
  payments = [],
  refreshData = () => {},
  pushInsert = async () => {},
  pushUpdate = async () => {},
  logActivity = async () => {},
  currentUserName = 'System'
}: any) => {

  const [openActionDropdown, setOpenActionDropdown] = useState<any>(null);

  // HELPER FUNCTIONS
  const resolveOrderAndLead = (prodItem: any) => {
    const order = orders?.find((o: any) => o.order_id === prodItem.tracking_id || o.order_id === prodItem.order_id) || {};
    let lead = leads?.find((l: any) => l.lead_id === order?.lead_id) || {};
    if (!lead || Object.keys(lead).length === 0) {
      lead = leads?.find((l: any) => l.lead_id === prodItem.tracking_id || l.lead_id === prodItem.order_id) || {};
    }
    return { order, lead };
  };

  const getTargetDeliveryDateFromAssignments = (prod: any) => {
    const assignedForOrder = (editorAssignments || []).filter((a: any) => 
      a.production_id === prod.production_id || 
      (prod.order_id && a.order_id === prod.order_id) ||
      (prod.tracking_id && a.order_id === prod.tracking_id)
    );
    if (assignedForOrder.length > 0) {
      const dates = assignedForOrder.map((a: any) => new Date(a.target_finish_date || 0).getTime()).filter(t => t > 0);
      if (dates.length > 0) {
        return new Date(Math.max(...dates)).toISOString().split('T')[0];
      }
    }
    return '';
  };

  const parseDeliverablesWithQty = (description: string, eventNameStr: string = '', eventIdStr: string = '') => {
    if (!description || typeof description !== 'string') return [];
    try {
      const parsed = JSON.parse(description);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          let n = item.name || item.deliverable_name || item.text || item.title || '';
          let q = parseInt(item.qty || item.quantity || 1, 10);
          if (isNaN(q)) q = 1;
          return { name: n, qty: q };
        }).filter(item => item.name);
      }
    } catch (e) {
      // Not JSON
    }
    let lines = description.split(/\\n|,/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      let cleaned = line.replace(/^\\s*([0-9]+\\.?\\s*\\)?|-|\\*)\\s*/, '').trim();
      let qty = 1;
      let name = cleaned;
      const qtyMatch = cleaned.match(/^(\\d+)\\s*[xX]\\s+(.+)$/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
        name = qtyMatch[2].trim();
      } else {
        const qtyMatchEnd = cleaned.match(/^(.+?)\\s*[\\(\\[]?(\\d+)[\\)\\]]?$/i);
        if (qtyMatchEnd) {
          name = qtyMatchEnd[1].trim();
          qty = parseInt(qtyMatchEnd[2], 10);
        }
      }
      return { name, qty };
    });
  };

  const getAssignedDeliverablesForProd = (prod: any, filterUnassigned = false) => {
    const { order, lead } = resolveOrderAndLead(prod);
    const eventsList = ((prod as any).events && Array.isArray((prod as any).events) && (prod as any).events.length > 0)
      ? (prod as any).events
      : (lead?.events && Array.isArray(lead.events) && lead.events.length > 0)
        ? lead.events
        : (order?.events && Array.isArray(order.events) && order.events.length > 0)
          ? order.events
          : [];
    
    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';
    if (!deliverablesText && lead) {
      const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
      targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const targetLatestQuote = targetLeadQuotations[0];
      if (targetLatestQuote) {
        deliverablesText = targetLatestQuote.deliverables_description || '';
      }
    }
    
    const listToProcess = eventsList.length > 0 ? eventsList : [null];
    const results: { name: string; qty: number; eventId?: string; eventName?: string }[] = [];
    
    for (let idx = 0; idx < listToProcess.length; idx++) {
      const currentEvent = listToProcess[idx];
      const currentEventName = currentEvent ? (currentEvent.event_name || currentEvent.event_type || \`Event \${idx + 1}\`) : (prod.custom_event_name || \`Event \${idx + 1}\`);
      const currentEventId = currentEvent ? (currentEvent.id || currentEvent.event_id) : prod.event_id;
      let parsedDeliverablesList: { name: string; qty: number }[] = [];
      if (currentEvent && currentEvent.deliverables) {
        if (Array.isArray(currentEvent.deliverables)) {
          parsedDeliverablesList = parseDeliverablesWithQty(JSON.stringify(currentEvent.deliverables));
        } else if (typeof currentEvent.deliverables === 'string') {
          parsedDeliverablesList = parseDeliverablesWithQty(currentEvent.deliverables);
        }
      }
      if (parsedDeliverablesList.length === 0) {
        parsedDeliverablesList = parseDeliverablesWithQty(deliverablesText, currentEventName, currentEventId);
      }
      parsedDeliverablesList.forEach(d => {
        results.push({ name: d.name, qty: d.qty, eventId: currentEventId, eventName: currentEventName });
      });
    }
    
    if (filterUnassigned) {
      const orderId = order?.order_id || (prod as any).order_id || prod.tracking_id;
      const assignedForThis = (editorAssignments || []).filter((a: any) => 
        a.production_id === prod.production_id || a.order_id === orderId
      );
      return results.filter(d => {
        return assignedForThis.some((a: any) => 
          (a.speciality === d.name || a.deliverable_id === d.name) &&
          (!d.eventId || !a.event_id || a.event_id === d.eventId)
        );
      });
    }
    return results;
  };

  const parseQtyAndText = (speciality: string) => {
    return { text: speciality };
  };

  const isServerUploadSaved = (assignment: any, prod: any) => {
    if (!assignment) return { isUploaded: false, folderName: '', eventDate: '', uploadLink: '' };
    const uploadedStr = (assignment.server_uploaded || assignment.is_uploaded || assignment.uploaded || assignment.isUploaded || '').toString().toLowerCase();
    const isUp = uploadedStr === 'true' || uploadedStr === 'yes' || uploadedStr === '1';
    return {
      isUploaded: isUp,
      folderName: assignment.server_folder_name || assignment.folder_name || '',
      eventDate: assignment.event_date || assignment.server_event_date || '',
      uploadLink: assignment.edited_drive_link || assignment.final_drive_link || ''
    };
  };

  const toInputDateFormat = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}-\${String(d.getDate()).padStart(2, '0')}\`;
  };

  const getRawFootageStatus = (prod: any) => 'Verified Footage';
  const getProductionStatus = (prod: any) => prod.editing_status || 'Verified Footage';

  // MODAL STATES
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [newStatusRemarks, setNewStatusRemarks] = useState('');
  const [lastModalProdId, setLastModalProdId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [reassignEditor, setReassignEditor] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);

  // WORKFLOW STATES
${states}

  // WORKFLOW HANDLERS
  // We mock out Whatsapp Share logic if not provided
  const setWhatsappShareModalOpen = () => {};
  const setAssignedEditorsModalProd = () => {};
  const prepareEditorWhatsappData = () => {};
  const parseExactDeliverables = () => [];
  const setCustomDeliverables = () => {};
  const setDeliverableStaffRows = () => {};
  const setValidationAttempted = () => {};
  const setSelectedWfStaffByDeliverable = () => {};
  const setDeliverablesTargetDates = () => {};
  const setWfStaffTypeByDeliverable = () => {};
  const updateProduction = () => {};
  const setClientAcceptanceProd = () => {};
  const setCaUploadConfirmations = () => {};
  const caUploadingProof = false;
  const staff = productionStaff;
  const triggerAutoScrollAndFocus = () => {};

  // Initialization effect
  useEffect(() => {
    if (workflowActionType === 'assign_editor' && activeWorkflowProd && wfEventSections.length === 0) {
      handleOpenAssignEditor(activeWorkflowProd);
    }
  }, [workflowActionType, activeWorkflowProd]);

${fixedHandlers}

  if (!activeWorkflowProd || !workflowActionType) return null;

  return (
    <>
${modal}
    </>
  );
};
`;

fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', componentStart);
