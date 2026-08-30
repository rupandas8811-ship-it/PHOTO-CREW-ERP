import React, { useState, useEffect } from 'react';
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
    let lines = description.split(/\n|,/).map(l => l.trim()).filter(l => l.length > 0);
    return lines.map(line => {
      let cleaned = line.replace(/^\s*([0-9]+\.?\s*\)?|-|\*)\s*/, '').trim();
      let qty = 1;
      let name = cleaned;
      const qtyMatch = cleaned.match(/^(\d+)\s*[xX]\s+(.+)$/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
        name = qtyMatch[2].trim();
      } else {
        const qtyMatchEnd = cleaned.match(/^(.+?)\s*[\(\[]?(\d+)[\)\]]?$/i);
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
      const currentEventName = currentEvent ? (currentEvent.event_name || currentEvent.event_type || `Event ${idx + 1}`) : (prod.custom_event_name || `Event ${idx + 1}`);
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [wfEditor, setWfEditor] = useState('Unassigned');
  const [wfTargetDeliveryDate, setWfTargetDeliveryDate] = useState('');
  const [wfTargetDeliveryTime, setWfTargetDeliveryTime] = useState('');
  const [wfPriority, setWfPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [wfProjectNotes, setWfProjectNotes] = useState('');
  const [wfInternalComments, setWfInternalComments] = useState('');
  const [assignmentRows, setAssignmentRows] = useState<{ speciality: string; staffId: string; staffName: string }[]>([
    { speciality: '', staffId: '', staffName: '' }
  ]);
  interface EventSectionItem {
    qty: number;
    text: string;
    editor: string;
    assignment_id?: string;
    status?: string;
  }

  interface EventSection {
    eventId: string;
    eventName: string;
    items: EventSectionItem[];
  }

  const [wfEventSections, setWfEventSections] = useState<EventSection[]>([]);
  const [wfError, setWfError] = useState('');
  const [wfSuccess, setWfSuccess] = useState('');

  

  
  const [deliverableStaffRows, setDeliverableStaffRows] = useState<Record<string, any[]>>({});
  const [wfReviewLink, setWfReviewLink] = useState('');
  const [wfPreviewLink, setWfPreviewLink] = useState('');
  const [wfReviewNotes, setWfReviewNotes] = useState('');
  const [wfRevisionNotes, setWfRevisionNotes] = useState('');
  const [wfRevisionDeadline, setWfRevisionDeadline] = useState('');
  const [wfDeliveryLink, setWfDeliveryLink] = useState('');
  const [wfGoogleDriveLink, setWfGoogleDriveLink] = useState('');
  const [wfDownloadLink, setWfDownloadLink] = useState('');
  const [wfDeliveryNotes, setWfDeliveryNotes] = useState('');
  const [qcNotes, setQcNotes] = useState('');
  const [reviewLink, setReviewLink] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [revisionComments, setRevisionComments] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [deliveryLink, setDeliveryLink] = useState('');
  const [currentRole, setCurrentRole] = useState('Admin'); // Fallback
  
  const updateOrderStage = async (id: string, stage: string) => {};
  const getAssignedEditorsList = (prod: any) => [];
  const getRawFootageDriveLink = () => '';
  const performBusinessOwnerReview = async (prod: any, status: any) => {};
  type EditingStatus = string;

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
  const updateProduction = (id: string, data: any) => {};
  const setClientAcceptanceProd = () => {};
  const setCaUploadConfirmations = () => {};
  const caUploadingProof = false;
  const staff = productionStaff;
  const triggerAutoScrollAndFocus = (s: string, t: number) => {};

  // Initialization effect
  useEffect(() => {
    if (workflowActionType === 'assign_editor' && activeWorkflowProd && wfEventSections.length === 0) {
      handleOpenAssignEditor(activeWorkflowProd);
    }
  }, [workflowActionType, activeWorkflowProd]);

  const handleOpenAssignEditor = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    setActiveWorkflowProd(prod);
    setWfError('');
    
    // Parse target delivery date
    const existingDate = getTargetDeliveryDateFromAssignments(prod) || prod.target_delivery_date || '';
    setWfTargetDeliveryDate(existingDate);
    
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

    const orderId = order?.order_id || (prod as any).order_id || prod.tracking_id;
    const listToProcess = eventsList.length > 0 ? eventsList : [null];
    const sections: EventSection[] = [];

    for (let idx = 0; idx < listToProcess.length; idx++) {
      const currentEvent = listToProcess[idx];
      const currentEventName = currentEvent ? (currentEvent.event_name || currentEvent.event_type || `Event ${idx + 1}`) : (prod.custom_event_name || `Event ${idx + 1}`);
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

      const assignedForThis = (editorAssignments || []).filter(a => 
        (a.production_id === prod.production_id || a.order_id === orderId) && 
        (!currentEventId || !a.event_id || a.event_id === currentEventId)
      );

      const tempMap = new Map<string, { qty: number; text: string; editor: string; assignment_id?: string; status?: string }>();
      const usedAssignments = new Set<string>();

      for (const d of parsedDeliverablesList) {
        const qty = d.qty || 1;
        const text = d.name;
        if (text) {
          const existing = tempMap.get(text);
          if (existing) {
            existing.qty += qty;
          } else {
            const existingAssignment = assignedForThis.find(a => (a.speciality === text || a.deliverable_id === text) && !usedAssignments.has(a.assignment_id));
            const editor = existingAssignment ? (existingAssignment.staff_name || 'Unassigned') : 'Unassigned';
            if (existingAssignment) {
              usedAssignments.add(existingAssignment.assignment_id);
            }
            tempMap.set(text, {
              qty,
              text,
              editor,
              assignment_id: existingAssignment?.assignment_id,
              status: existingAssignment?.status
            });
          }
        }
      }

      sections.push({
        eventId: currentEventId || `EVT-0${idx + 1}`,
        eventName: currentEventName,
        items: Array.from(tempMap.values())
      });
    }

    setWfEventSections(sections);
    setWfProjectNotes(prod.project_notes || prod.remarks || '');
    setWorkflowActionType('assign_editor');
  };

  const handleSectionEditorChange = (sectionIndex: number, itemIndex: number, editorName: string) => {
    setWfEventSections(prev => {
      const updated = [...prev];
      const section = { ...updated[sectionIndex] };
      const items = [...section.items];
      items[itemIndex] = { ...items[itemIndex], editor: editorName };
      section.items = items;
      updated[sectionIndex] = section;
      return updated;
    });
  };


  if (!activeWorkflowProd || !workflowActionType) return null;

  return (
    <>
      {/* STEP-BY-STEP INTERACTIVE WORKFLOW MODALS */}
      {activeWorkflowProd && workflowActionType && (() => {
        const order = (orders || []).find(o => {
          const rf = (rawFootage || []).find(f => f.tracking_id === activeWorkflowProd.tracking_id);
          return rf?.order_id === o.order_id;
        });
        const customerName = order ? order?.customer_name : 'Customer';
        const orderId = order ? order?.order_id : 'Order';
        
        const payment = order ? (payments || []).find(p => p.order_id === order?.order_id) : null;
        const totalAmount = order?.quotation_amount || 0;
        const advanceReceived = payment?.advance_received !== undefined ? payment.advance_received : (payment?.advance_paid || 0);
        const balanceDue = payment?.balance_due !== undefined ? payment.balance_due : (totalAmount - advanceReceived);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div id="production_workflow_modal" className={`bg-zinc-950 border border-zinc-900 rounded-2xl ${
              workflowActionType === 'assign_editor'
                ? 'w-full md:w-[90%] lg:w-[85%] max-w-5xl'
                : workflowActionType === 'manage_status'
                  ? 'max-w-4xl w-full'
                  : 'max-w-sm w-full'
            } overflow-hidden shadow-2xl flex flex-col transition-all duration-300`}>
              
              {/* Header */}
              <div className="p-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black uppercase tracking-widest text-violet-400 block mb-0.5">
                    Step Workflow Wizard • {orderId}
                  </span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    {workflowActionType === 'assign_editor' && 'Assign Editor'}
                    {workflowActionType === 'reassign_staff' && 'Reassign Staff'}
                    {workflowActionType === 'delivery_checklist' && 'Delivery Checklist'}
                    {workflowActionType === 'send_review' && 'Step 4: Send For Review'}
                    {workflowActionType === 'request_revision' && 'Step 5: Request Revision'}
                    {workflowActionType === 'deliver_project' && 'Step 8: Deliver Project'}
                    {workflowActionType === 'manage_payment_close' && 'Release & Close Options'}
                    {workflowActionType === 'manage_status' && 'CRM Status Management'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>

              {/* Form Body wrapper */}
              <div className={`${workflowActionType === 'assign_editor' ? 'p-3.5 sm:p-4 pb-2' : 'p-4'} overflow-y-auto max-h-[85vh]`}>
                <p className="text-[11px] text-zinc-400 mb-2.5">
                  Step workflow update for <strong className="text-white">{customerName}</strong>.
                </p>

                {/* FORM: Reassign Staff (Deliverable-Wise) */}
                {workflowActionType === 'reassign_staff' && activeWorkflowProd && (
                  <div className="space-y-5 font-sans text-left">
                    
                    {/* 1. Deliverable / Lead Details (Read-only) */}
                    <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-3">
                      <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                        <h4 className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono">
                          1. Deliverable / Lead Details
                        </h4>
                        <span className="text-[9px] text-zinc-500 font-mono">Read-Only</span>
                      </div>
                      
                      {(() => {
                        const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                        
                        const leadId = activeWorkflowProd.tracking_id || '—';
                        const customerName = activeWorkflowProd.customer_name || order?.customer_name || lead?.customer_name || '—';
                        const eventName = activeWorkflowProd.custom_event_name || order?.custom_event_name || lead?.custom_event_name || '—';
                        const eventType = activeWorkflowProd.event_type || order?.event_type || lead?.event_type || '—';
                        const eventShootType = activeWorkflowProd.shoot_type || activeWorkflowProd.desired_event_shoot_type || order?.shoot_type || lead?.shoot_type || order?.desired_event_shoot_type || lead?.desired_event_shoot_type || '—';
                        const packageName = order?.package_name || lead?.package_name || '—';
                        const deliverables = order?.deliverables_description || lead?.deliverables_description || '—';
                        const eventDate = activeWorkflowProd.event_date || order?.event_date || lead?.event_date || '—';
                        const eventLocation = order?.event_location || lead?.event_location || '—';
                        const currentStatus = activeWorkflowProd.editing_status || '—';

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Customer Name</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{customerName}</div>
                            </div>
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Name</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{eventName}</div>
                            </div>
                            <div className="space-y-1 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Type</span>
                              <div className="text-zinc-200 font-semibold flex items-center bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-900 min-h-[38px]">{eventType}</div>
                            </div>
                            <div className="space-y-1 md:col-span-2 lg:col-span-1">
                              <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Current Status</span>
                              <div className="text-violet-400 font-extrabold flex items-center bg-purple-950/20 px-3 py-2 rounded-xl border border-purple-900/30 font-mono min-h-[38px]">{currentStatus}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                     {/* 2. ASSIGN PRODUCTION STAFF (DELIVERABLE-WISE) */}
                     <div className="space-y-4">
                      <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
                        <h4 className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono">
                          2. Assign Production Staff (Deliverable-Wise)
                        </h4>
                      </div>

                      {wfError && (
                        <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                          ⚠️ {wfError}
                        </div>
                      )}
                      {wfSuccess && (
                        <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs p-3 rounded-xl font-mono">
                          {wfSuccess}
                        </div>
                      )}

                      <fieldset disabled={isProjectLocked(activeWorkflowProd?.editing_status)} className="space-y-4">
                      {/* Single Common Target Delivery Date at the top */}
                      <div id="wf-target-delivery-date-container" className={`p-3 bg-zinc-900/10 border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        validationAttempted && !wfTargetDeliveryDate
                          ? 'border-rose-500 bg-rose-950/5'
                          : 'border-zinc-900'
                      }`}>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono flex items-center gap-1">
                            Target Delivery Date <span className="text-rose-500">*</span>
                          </label>
                          <p className="text-[10px] text-zinc-500 font-mono">Applies to all assignments on this lead</p>
                        </div>
                        <input
                          type="date"
                          id="wf-target-delivery-date"
                          value={wfTargetDeliveryDate}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setWfTargetDeliveryDate(newDate);
                          }}
                          className={`bg-zinc-950 border text-xs text-zinc-300 rounded-xl px-3 py-1.5 font-mono focus:outline-none min-h-[34px] sm:w-48 ${
                            validationAttempted && !wfTargetDeliveryDate
                              ? 'border-rose-500 ring-1 ring-rose-500/30'
                              : 'border-zinc-900 hover:border-zinc-800 focus:border-purple-500'
                          }`}
                        />
                      </div>

                      {/* Compact Deliverable Assignment Table */}
                      <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                        <div className="overflow-x-auto w-full">
                          <table className="w-full text-left border-collapse min-w-max">
                            <thead>
                              <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                                <th className="px-3.5 py-2 font-bold w-[35%]">Deliverable</th>
                                <th className="px-3.5 py-2 font-bold w-[65%]">Assignments (Staff Type & Assigned Staff)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900">
                              {customDeliverables.map((deliverable, dIndex) => {
                                const rows = deliverableStaffRows[deliverable] || [];
                                const isEmpty = rows.filter(r => r.staffId).length === 0;

                                return (
                                  <tr 
                                    key={deliverable}
                                    id={`deliverable-block-${dIndex}`}
                                    className={`transition-colors align-top ${
                                      validationAttempted && isEmpty
                                        ? 'bg-rose-950/5 hover:bg-rose-950/10'
                                        : 'hover:bg-zinc-900/10'
                                    }`}
                                  >
                                    {/* Deliverable Name with compact single line + delete-deliverable button */}
                                    <td className="px-3.5 py-2.5 font-sans border-r border-zinc-900/50">
                                      <div className="flex items-center justify-between gap-2">
                                        <div 
                                          className="text-xs font-bold text-zinc-200 truncate pr-2 select-none"
                                          title={deliverable}
                                        >
                                          ✔ {deliverable}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Compact Staff Row Assignment Sub-table */}
                                    <td className="px-3.5 py-1.5">
                                      <div className="space-y-1.5">
                                        {rows.map((row, rIndex) => {
                                          return (
                                            <div 
                                              key={row.id} 
                                              className="flex items-center gap-2"
                                            >
                                              {/* Staff Type Select Dropdown */}
                                              <div className="w-28 shrink-0">
                                                <select
                                                  value={row.staffType}
                                                  onChange={(e) => {
                                                    const newType = e.target.value as 'In-House' | 'Freelancer';
                                                    setDeliverableStaffRows(prev => {
                                                      const updatedRows = [...(prev[deliverable] || [])];
                                                      updatedRows[rIndex] = {
                                                        ...updatedRows[rIndex],
                                                        staffType: newType,
                                                        staffId: ''
                                                      };
                                                      return {
                                                        ...prev,
                                                        [deliverable]: updatedRows
                                                      };
                                                    });
                                                  }}
                                                  className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-300 rounded-lg px-2 py-1 font-sans focus:outline-none focus:border-purple-500 cursor-pointer h-7"
                                                >
                                                  <option value="In-House">In-House</option>
                                                  <option value="Freelancer">Freelancer</option>
                                                </select>
                                              </div>

                                              {/* Custom Staff Dropdown */}
                                              <div className="flex-1 min-w-max">
                                                <StaffSelectDropdown
                                                  deliverable={deliverable}
                                                  rowId={row.id}
                                                  staffType={row.staffType}
                                                  selectedStaffId={row.staffId}
                                                  onSelect={(val) => {
                                                    setDeliverableStaffRows(prev => {
                                                      const updatedRows = [...(prev[deliverable] || [])];
                                                      updatedRows[rIndex] = {
                                                        ...updatedRows[rIndex],
                                                        staffId: val
                                                      };
                                                      return {
                                                        ...prev,
                                                        [deliverable]: updatedRows
                                                      };
                                                    });
                                                  }}
                                                  productionStaff={productionStaff}
                                                  editorAssignments={editorAssignments}
                                                  onOpenRoster={(name) => setRosterStaffName(name)}
                                                  allRowsForDeliverable={rows}
                                                />
                                              </div>

                                              {/* Row Actions */}
                                              <div className="w-6 shrink-0 flex justify-center">
                                                {rows.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setDeliverableStaffRows(prev => {
                                                        const updatedRows = (prev[deliverable] || []).filter(r => r.id !== row.id);
                                                        return {
                                                          ...prev,
                                                          [deliverable]: updatedRows
                                                        };
                                                      });
                                                    }}
                                                    className="text-zinc-600 hover:text-rose-400 transition-colors p-1 cursor-pointer text-xs"
                                                    title="Remove Staff Assignment"
                                                  >
                                                    ✕
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Add Staff Button inside the Deliverable Assignment cell */}
                                        <div className="pt-0.5 flex items-center justify-between">
                                          {validationAttempted && isEmpty && (
                                            <span className="text-[10px] text-rose-500 font-mono italic">
                                              ⚠️ Required: Assign at least one staff
                                            </span>
                                          )}
                                          <div className="flex-1" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDeliverableStaffRows(prev => {
                                                return {
                                                  ...prev,
                                                  [deliverable]: [
                                                    ...(prev[deliverable] || []),
                                                    { id: `row-${Math.random()}`, staffType: 'In-House', staffId: '' }
                                                  ]
                                                };
                                              });
                                            }}
                                            className="px-2.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-purple-400 hover:text-purple-300 text-[10px] font-mono rounded transition-all cursor-pointer flex items-center gap-1 mt-0.5"
                                          >
                                            <span>+ Add Staff</span>
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {customDeliverables.length === 0 && (
                          <div className="text-center py-6 text-zinc-500 text-xs italic font-mono bg-zinc-900/10 border-t border-zinc-900">
                            No deliverables found for this order.
                          </div>
                        )}
                      </div>

                      {/* Read-only Production Staff Roster Popup */}
                      {rosterStaffName && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full w-full max-w-2xl p-6 shadow-2xl flex flex-col space-y-4">
                            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                              <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                                <span>📅</span> Production Staff Roster — <span className="text-[#a78bfa]">{rosterStaffName}</span>
                              </h3>
                              <button
                                onClick={() => setRosterStaffName(null)}
                                className="text-zinc-500 hover:text-white transition-colors text-lg"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="overflow-x-auto w-full rounded-xl border border-zinc-900 bg-zinc-950 max-h-[300px]">
                              <table className="w-full text-left border-collapse min-w-max">
                                <thead>
                                  <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                                    <th className="px-4 py-3 font-bold">Staff Name</th>
                                    <th className="px-4 py-3 font-bold">Order ID</th>
                                    <th className="px-4 py-3 font-bold">Assigned Date</th>
                                    <th className="px-4 py-3 font-bold">Target Delivery Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                                  {staffActiveAssignments.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
                                        No active assignments found for this staff member.
                                      </td>
                                    </tr>
                                  ) : (
                                    staffActiveAssignments.map((row, idx) => (
                                      <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{row.staffName}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{row.orderId}</td>
                                        <td className="px-4 py-3 text-zinc-400">{row.assignedDate}</td>
                                        <td className="px-4 py-3 text-zinc-400">{row.targetDeliveryDate}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => setRosterStaffName(null)}
                                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-zinc-300 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      </fieldset>
                      {/* Save & Assign Action Buttons */}
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                            setWfError('');
                            setWfSuccess('');
                          }}
                          className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-855 text-zinc-400 hover:text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setValidationAttempted(true);
                            if (!wfTargetDeliveryDate) {
                              setWfError('Target Delivery Date is required.');
                              return;
                            }
                            // Validate that at least one staff is assigned to each deliverable
                            for (const d of customDeliverables) {
                              const rows = deliverableStaffRows[d] || [];
                              if (rows.filter(r => r.staffId).length === 0) {
                                setWfError(`Assign at least one staff for deliverable: ${d}`);
                                return;
                              }
                            }
                            
                            setWfError('');
                            const prodId = activeWorkflowProd.production_id;
                            await autoSaveAssignments(deliverableStaffRows, wfTargetDeliveryDate);
                            setWfSuccess('Editor assignments saved successfully!');
                            setTimeout(() => {
                              setActiveWorkflowProd(null);
                              setWorkflowActionType(null);
                              setWfSuccess('');
                              // Trigger WhatsApp sharing modal automatically
                              prepareEditorWhatsappData(prodId);
                            }, 1500);
                          }}
                          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* FORM: Assign Editor */}
                {workflowActionType === 'assign_editor' && activeWorkflowProd && (() => {
                  const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                  const orderIdDisplay = order?.order_id || (activeWorkflowProd as any).order_id || activeWorkflowProd.tracking_id;
                  const customerNameDisplay = order?.customer_name || lead?.customer_name || activeWorkflowProd.customer_name || 'Client';

                  return (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!wfTargetDeliveryDate) {
                        setWfError('Please select a Target Delivery Date.');
                        return;
                      }
                      
                      try {
                        setIsSaving(true);
                        const orderId = order?.order_id || activeWorkflowProd?.tracking_id || activeWorkflowProd?.production_id;

                        const assignedForOrder = (editorAssignments || []).filter(a => 
                          a.production_id === activeWorkflowProd.production_id || a.order_id === orderId
                        );

                        // 1. Delete all existing editor assignments for this production
                        const { error: deleteError } = await supabaseClient
                          .from('editor_assignments')
                          .delete()
                          .eq('production_id', activeWorkflowProd.production_id);
                          
                        if (deleteError) throw deleteError;
                        
                        // 2. Prepare new assignments across all sections
                        const newAssignments = [];
                        for (const section of wfEventSections) {
                          for (const item of section.items) {
                            if (!item.editor || item.editor === 'Unassigned') continue;
                            const st = (productionStaff || []).find(s => s.name === item.editor);
                            if (st) {
                              const originalAssignment = assignedForOrder.find(a => 
                                (a.event_id === section.eventId || !a.event_id) && 
                                (a.speciality === item.text || a.deliverable_id === item.text)
                              );
                              const hasChanged = originalAssignment ? originalAssignment.staff_name !== item.editor : true;
                              const finalStatus = hasChanged ? 'Assigned' : (originalAssignment?.status || 'Assigned');
                              
                              const id = item.assignment_id || `EDR-${Math.floor(100000 + Math.random() * 900000)}`;
                              const preservedFields = !hasChanged && originalAssignment ? { ...originalAssignment } : {};
                              
                              newAssignments.push({
                                ...preservedFields,
                                assignment_id: id,
                                production_id: activeWorkflowProd.production_id,
                                order_id: orderId,
                                event_id: section.eventId,
                                deliverable_id: item.text,
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                speciality: item.text,
                                assigned_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                target_finish_date: wfTargetDeliveryDate,
                                status: finalStatus,
                                created_at: originalAssignment?.created_at || new Date().toISOString()
                              });
                            }
                          }
                        }
                        
                        if (newAssignments.length > 0) {
                          const { error: insertError } = await supabaseClient
                            .from('editor_assignments')
                            .insert(newAssignments);
                          if (insertError) throw insertError;
                        }
                        
                        // 3. Update the production record
                        const uniqueEditors = Array.from(new Set(newAssignments.map(a => a.staff_name).filter(Boolean)));
                        const primaryEditor = uniqueEditors[0] || 'Unassigned';
                        const assignedStaffJoined = uniqueEditors.join(', ');
                        
                        const activeStaffList = (productionStaff || []).filter(s => s.status === 'Active');
                        const assignedRoles = Array.from(new Set(newAssignments.map(a => {
                          const staffMem = activeStaffList.find(s => s.staff_name === a.staff_name);
                          return staffMem?.role || 'Editor';
                        })));
                        const rolesJoined = assignedRoles.join(', ') || 'Editor';
                        
                        let newEditingStatus = 'Assigned Editor';
                        if (newAssignments.length > 0) {
                          const getTaskStageRank = (st: string, driveLink?: string) => {
                            const status = st || '';
                            if (['Client Acceptance'].includes(status)) return 5;
                            if (['Completed', 'Editing Completed', 'Editing Complete'].includes(status)) return 4;
                            if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
                            if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
                            if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
                            return 0;
                          };

                          const ranks = newAssignments.map(a => getTaskStageRank(a.status, (a as any).edited_drive_link));
                          const minRank = Math.min(...ranks);

                          if (minRank >= 5) newEditingStatus = 'Client Acceptance';
                          else if (minRank >= 4) newEditingStatus = 'Editing Completed';
                          else if (minRank >= 3) newEditingStatus = 'Customer Review';
                          else if (minRank >= 2) newEditingStatus = 'Editing Started';
                          else if (minRank >= 1) newEditingStatus = 'Assigned Editor';
                        }
                        
                        await updateProduction(activeWorkflowProd.production_id, {
                          editor_assigned: primaryEditor,
                          assigned_staff: assignedStaffJoined,
                          target_delivery_date: wfTargetDeliveryDate,
                          expected_delivery_date: wfTargetDeliveryDate,
                          project_notes: wfProjectNotes,
                          editing_status: newEditingStatus,
                          production_status: newEditingStatus,
                          production_role: rolesJoined,
                          assigned_role: rolesJoined
                        });
                        
                        if (typeof refreshData === 'function') {
                          refreshData();
                        }
                        
                        alert("Editor assignments saved successfully!");
                        
                        setActiveWorkflowProd(null);
                        setWorkflowActionType(null);
                      } catch (err: any) {
                        setWfError(err.message || 'Failed to assign editors');
                      } finally {
                        setIsSaving(false);
                      }
                    }} className="space-y-5 font-sans text-left">
                      <div className="mb-2 text-xs text-zinc-400 font-mono flex flex-wrap items-center gap-4 border-b border-zinc-900 pb-3">
                        <div><span className="text-zinc-500 font-bold uppercase">Order ID:</span> <strong className="text-purple-300 font-bold">{orderIdDisplay}</strong></div>
                        <div><span className="text-zinc-500 font-bold uppercase">Customer:</span> <strong className="text-zinc-200 font-bold">{customerNameDisplay}</strong></div>
                      </div>

                      {wfError && (
                        <div className="bg-rose-950/20 border border-rose-900/30 text-rose-400 text-xs p-3 rounded-xl font-mono">
                          ⚠️ {wfError}
                        </div>
                      )}

                      {/* EVENT SECTIONS */}
                      <div className="space-y-6">
                        {wfEventSections.map((section, sIdx) => (
                          <div key={sIdx} className="space-y-2">
                            {/* Section Header: ONLY Event Name */}
                            <div className="pb-1 border-b border-zinc-800">
                              <span className="text-purple-400 font-extrabold text-xs uppercase tracking-wider font-mono">
                                {section.eventName}
                              </span>
                            </div>

                            <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950">
                              <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse min-w-max">
                                  <thead>
                                    <tr className="bg-zinc-900/50 border-b border-zinc-900 font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
                                      <th className="px-4 py-2.5 font-bold w-[12%] text-center">QTY</th>
                                      <th className="px-4 py-2.5 font-bold w-[53%]">DELIVERABLE NAME</th>
                                      <th className="px-4 py-2.5 font-bold w-[35%]">ASSIGN EDITOR</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-900 font-sans text-xs text-zinc-300">
                                    {section.items.length === 0 ? (
                                      <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-500 font-mono text-xs">
                                          No deliverables found for this event.
                                        </td>
                                      </tr>
                                    ) : (
                                      section.items.map((row, itemIdx) => (
                                        <tr key={itemIdx} className="hover:bg-zinc-900/10 transition-colors">
                                          <td className="px-4 py-3 font-mono text-xs text-center font-bold text-zinc-400">
                                            {row.qty}
                                          </td>
                                          <td className="px-4 py-3 font-semibold text-zinc-200">
                                            {row.text}
                                          </td>
                                          <td className="px-4 py-2">
                                            <select
                                              value={row.editor}
                                              onChange={(e) => handleSectionEditorChange(sIdx, itemIdx, e.target.value)}
                                              className="w-full bg-zinc-905 border border-zinc-900 hover:border-zinc-800 text-xs text-zinc-300 rounded-xl px-2.5 py-1.5 font-mono focus:outline-none focus:border-purple-500 cursor-pointer h-9"
                                            >
                                              <option value="Unassigned">Select Editor</option>
                                              {(productionStaff || []).map(s => (
                                                <option key={s.staff_id} value={s.name}>{s.name}</option>
                                              ))}
                                            </select>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* SHARED TARGET DELIVERY DATE */}
                      <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-xl space-y-2 mt-4">
                        <label className="block text-[10px] font-mono text-[#a78bfa] uppercase font-bold tracking-widest">
                          Target Delivery Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={wfTargetDeliveryDate}
                          onChange={(e) => setWfTargetDeliveryDate(e.target.value)}
                          className="w-full sm:w-64 bg-zinc-950 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Notes (Optional)</label>
                        <textarea
                          rows={3}
                          value={wfProjectNotes}
                          onChange={(e) => setWfProjectNotes(e.target.value)}
                          className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono resize-none focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setActiveWorkflowProd(null); setWorkflowActionType(null); }}
                          className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer uppercase font-mono tracking-wider"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer uppercase font-mono tracking-wider"
                        >
                          {isSaving ? 'Assigning...' : 'Assign Editor'}
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {/* FORM: Delivery Checklist */}
                {workflowActionType === 'delivery_checklist' && activeWorkflowProd && (() => {
                  const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                  const customerName = order?.customer_name || lead?.customer_name || '—';
                  const eventName = activeWorkflowProd.custom_event_name || order?.custom_event_name || lead?.custom_event_name || '—';
                  const eventType = activeWorkflowProd.event_type || order?.event_type || lead?.event_type || '—';
                  
                  const assignedDeliverables = getAssignedDeliverablesForProd(activeWorkflowProd, true);

                  // Validate real saved server upload status for each deliverable independently
                  const deliverableUploadStatuses = assignedDeliverables.map(item => {
                    const matchingAssign = (editorAssignments || []).find(a =>
                      (a.production_id === activeWorkflowProd.production_id ||
                       (order?.order_id && (a.order_id === order.order_id || a.production_id === order.order_id)) ||
                       (activeWorkflowProd.tracking_id && (a.order_id === activeWorkflowProd.tracking_id || a.production_id === activeWorkflowProd.tracking_id))) &&
                      (!activeWorkflowProd.event_id || !a.event_id || a.event_id === activeWorkflowProd.event_id) &&
                      (a.speciality === item.name || a.deliverable_id === item.name || parseQtyAndText(a.speciality || '').text === item.name || parseQtyAndText(a.deliverable_id || '').text === item.name)
                    );

                    const uploadStatus = isServerUploadSaved(matchingAssign, activeWorkflowProd);
                    return {
                      ...item,
                      matchingAssign,
                      isUploaded: uploadStatus.isUploaded,
                      folderName: uploadStatus.folderName,
                      eventDate: uploadStatus.eventDate,
                      uploadLink: uploadStatus.uploadLink,
                      staffName: matchingAssign?.staff_name || 'Unassigned'
                    };
                  });

                  return (
                    <form onSubmit={async (e) => {
                      e.preventDefault();

                      // Strict validation: cannot submit if any assigned deliverable lacks a real persisted server upload
                      const pendingUploads = deliverableUploadStatuses.filter(d => !d.isUploaded);
                      if (assignedDeliverables.length > 0 && pendingUploads.length > 0) {
                        alert(`Cannot submit deliverables!\n\nThe following ${pendingUploads.length} deliverable(s) do not have a verified server upload saved by their assigned editor:\n\n` +
                          pendingUploads.map(d => `• ${d.name} (${d.staffName}) - Server Upload Pending`).join('\n') +
                          `\n\nPlease wait for the editor(s) to upload the edited folders to the server.`
                        );
                        return;
                      }

                      try {
                        setIsSaving(true);
                        await updateProduction(activeWorkflowProd.production_id, {
                          editing_status: 'Client Acceptance'
                        });
                        const targetOrderId = order?.order_id || activeWorkflowProd.order_id || activeWorkflowProd.tracking_id || activeWorkflowProd.lead_id || lead?.lead_id;
                        if (targetOrderId && updateOrderStage) {
                          await updateOrderStage(targetOrderId, 'Client Acceptance');
                        }
                        setActiveWorkflowProd(null);
                        setWorkflowActionType(null);
                      } catch (err: any) {
                        alert("Failed to update status: " + (err.message || err));
                      } finally {
                        setIsSaving(false);
                      }
                    }} className="space-y-5 font-sans text-left">
                      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Customer Name</span>
                          <div className="text-zinc-200 font-semibold">{customerName}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Name</span>
                          <div className="text-zinc-200 font-semibold">{eventName}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-wider block font-mono">Event Type</span>
                          <div className="text-zinc-200 font-semibold">{eventType}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] text-[#a78bfa] uppercase font-black tracking-widest font-mono border-b border-zinc-900 pb-2 flex items-center justify-between">
                          <span>Deliverables Checklist</span>
                          <span className="text-zinc-400 font-mono text-[10px]">
                            {deliverableUploadStatuses.length > 0 
                              ? `${deliverableUploadStatuses.filter(d => d.isUploaded).length} / ${deliverableUploadStatuses.length} Uploaded to Server`
                              : `Order: ${order?.order_id || activeWorkflowProd.tracking_id}`
                            }
                          </span>
                        </h4>
                        {assignedDeliverables.length === 0 ? (
                          <div className="text-zinc-500 text-xs italic font-mono p-4 text-center bg-zinc-900/20 rounded-xl">
                            No assigned deliverables found for this order/event.
                            <label className="flex items-center gap-3 mt-3 justify-center text-zinc-300 cursor-pointer">
                              <input type="checkbox" required className="w-4 h-4 accent-purple-500 bg-zinc-900 border-zinc-700 rounded" />
                              <span className="font-semibold text-xs">Proceed without deliverables</span>
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {deliverableUploadStatuses.map((item, idx) => (
                              <div key={idx} className={`p-3.5 border rounded-xl transition-all ${
                                item.isUploaded
                                  ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200 shadow-sm'
                                  : 'bg-zinc-900/40 border-zinc-850 text-zinc-300'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={item.isUploaded}
                                      disabled
                                      className="w-4 h-4 accent-emerald-500 bg-zinc-950 border-zinc-700 rounded cursor-not-allowed"
                                    />
                                    <div>
                                      <span className="font-bold text-xs text-zinc-200 uppercase tracking-tight block">
                                        {item.name}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 block font-mono">
                                        ASSIGNED TO: <span className="text-zinc-400 font-bold">{item.staffName}</span> • STATUS:{' '}
                                        {item.isUploaded ? (
                                          <span className="text-emerald-400 font-bold">Ready for Delivery</span>
                                        ) : (
                                          <span className="text-rose-400 font-bold">Pending Editor Upload</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="inline-block px-2.5 py-1 bg-purple-500/10 text-purple-300 font-mono text-xs font-bold rounded-lg border border-purple-500/20">
                                      Qty: {item.qty}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    {item.isUploaded ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold">
                                        <span>☑</span>
                                        <span>Edited Folder is uploaded in Server</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 text-[11px] font-mono font-bold">
                                        <span>☐</span>
                                        <span>Edited Folder is uploaded in Server</span>
                                      </span>
                                    )}
                                  </div>
                                  {item.isUploaded ? (
                                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5 truncate">
                                      {item.folderName && <span className="text-emerald-300 font-bold truncate">📁 {item.folderName}</span>}
                                      {item.eventDate && <span className="text-zinc-500 font-bold shrink-0">({item.eventDate})</span>}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-mono text-rose-400/90 italic font-semibold">
                                      Pending upload by {item.staffName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setActiveWorkflowProd(null); setWorkflowActionType(null); }}
                          className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSaving ? 'Submitting...' : 'Submit Deliverables'}
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {/* FORM: Send For Review (Step 4) */}
                {workflowActionType === 'send_review' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      review_link: wfReviewLink,
                      preview_link: wfPreviewLink,
                      remarks: `Send for review: ${wfReviewNotes}`,
                      editing_status: 'Customer Review'
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Review Link * (Frame.io/Youtube/etc)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfReviewLink}
                        onChange={(e) => setWfReviewLink(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Preview Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfPreviewLink}
                        onChange={(e) => setWfPreviewLink(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Notes / Comments</label>
                      <textarea
                        rows={3}
                        placeholder="Notes on draft..."
                        value={wfReviewNotes}
                        onChange={(e) => setWfReviewNotes(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        Confirm Ready
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Request Revision (Step 5) */}
                {workflowActionType === 'request_revision' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      remarks: `Revision requested. Deadline: ${wfRevisionDeadline}. Special remarks: ${wfRevisionNotes}`,
                      editing_status: 'Revision Required'
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Revision Deadline *</label>
                      <input
                        type="date"
                        value={wfRevisionDeadline}
                        onChange={(e) => setWfRevisionDeadline(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Instructions / Change request notes *</label>
                      <textarea
                        rows={4}
                        placeholder="Special client revision highlights..."
                        value={wfRevisionNotes}
                        onChange={(e) => setWfRevisionNotes(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-red-650 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        File Revision
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Deliver Project (Step 8) */}
                {workflowActionType === 'deliver_project' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    updateProduction(activeWorkflowProd.production_id, {
                      remarks: `Release Deliverables: Links logged. Remark: ${wfDeliveryNotes}`,
                      delivery_link: wfDeliveryLink,
                      raw_footage_location: wfGoogleDriveLink,
                      editing_status: 'Delivered',
                      delivery_date: new Date().toISOString().split('T')[0]
                    });
                    setActiveWorkflowProd(null);
                    setWorkflowActionType(null);
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Final HD Gallery Delivery Link *</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={wfDeliveryLink}
                        onChange={(e) => setWfDeliveryLink(e.target.value)}
                        required
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Google Drive / Archive Location</label>
                      <input
                        type="url"
                        value={wfGoogleDriveLink}
                        onChange={(e) => setWfGoogleDriveLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-mono text-zinc-500 uppercase mb-1 font-bold">Delivery Remarks</label>
                      <textarea
                        rows={3}
                        placeholder="Credentials or links commentary..."
                        value={wfDeliveryNotes}
                        onChange={(e) => setWfDeliveryNotes(e.target.value)}
                        className="w-full bg-zinc-905 border border-zinc-900 text-xs rounded-xl p-2.5 text-white"
                      />
                    </div>

                    <div className="flex justify-end items-center gap-2 pt-3 border-t border-zinc-900/60 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        }}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-855 text-zinc-400 text-[10px] rounded-lg font-mono"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all"
                      >
                        Confirm Release
                      </button>
                    </div>
                  </form>
                )}

                {/* FORM: Manage Payment & Close (Step 9 & 10) */}
                {workflowActionType === 'manage_payment_close' && (
                  <div className="space-y-4 text-xs">
                    <div className="bg-zinc-900/50 p-4 border border-zinc-900 rounded-xl space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Order Quotation:</span>
                        <span className="text-zinc-200 font-bold">{formatINR(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500">Advance Received:</span>
                        <span className="text-emerald-400 font-bold">{formatINR(advanceReceived)}</span>
                      </div>
                      <div className="border-t border-zinc-900 my-1 pt-1 flex justify-between text-xs font-mono">
                        <span className="text-zinc-400 font-bold">Total Balance Due:</span>
                        <span className={`font-black ${balanceDue > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                          {formatINR(balanceDue)}
                        </span>
                      </div>
                    </div>

                    {balanceDue > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/10 rounded-xl">
                          <p className="text-[10px] text-amber-500 font-semibold leading-relaxed">
                            ⚠️ Outstanding balance of <strong>{formatINR(balanceDue)}</strong> remains. Mark "Payment Pending" until commercial clearance is log-checked.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateProduction(activeWorkflowProd.production_id, {
                                editing_status: 'Payment Pending'
                              });
                              setActiveWorkflowProd(null);
                              setWorkflowActionType(null);
                            }}
                            className="px-2 py-2 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-all"
                          >
                            Set Payment Pending
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStage('Completed' as any);
                              setDeliveryDate(new Date().toISOString().split('T')[0]);
                              setClosingNotes('');
                              setWorkflowActionType('close_project');
                            }}
                            className="px-2 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-805 text-[9px] font-semibold uppercase tracking-wider rounded-lg transition-all"
                          >
                            Archive Closed
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 text-green-400 bg-green-500/10 border border-green-500/10 rounded-xl flex items-center gap-2">
                          <span>✓</span>
                          <span className="text-[11px] font-semibold">Client Acceptance Completed!</span>
                        </div>

                        {currentRole === 'Business Owner' ? (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStage('Completed' as any);
                                setDeliveryDate(new Date().toISOString().split('T')[0]);
                                setClosingNotes('');
                                setWorkflowActionType('close_project');
                              }}
                              className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-650 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md"
                            >
                              🔐 Final Review & Close Project
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                            <div className="font-bold">Pending Business Owner Review</div>
                            <div className="text-[11px] text-zinc-400">
                              This project has reached Client Acceptance and is automatically queued in the <strong>Business Owner Dashboard</strong> under <strong>Orders Awaiting Final Approval</strong>. Only the Business Owner can perform final approval and close orders.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* FORM: CRM Status Management Popup */}
                {workflowActionType === 'manage_status' && (() => {
                  const projectLogs = (logs || []).filter(log => 
                    log.record_id === activeWorkflowProd.production_id ||
                    log.record_id === activeWorkflowProd.tracking_id ||
                    (order && log.record_id === order?.order_id)
                  );

                  const findLogForStage = (stage: string) => {
                    return projectLogs.find(log => 
                      log.new_stage === stage || 
                      log.action.toLowerCase().includes(`status=${stage.toLowerCase()}`) ||
                      log.action.toLowerCase().includes(`status='${stage.toLowerCase()}'`) ||
                      log.action.toLowerCase().includes(`status: ${stage.toLowerCase()}`)
                    );
                  };

                  const formatTimelineTimestamp = (isoStr: string) => {
                    if (!isoStr) return "";
                    const d = new Date(isoStr);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const day = String(d.getDate()).padStart(2, "0");
                    const month = months[d.getMonth()];
                    const year = d.getFullYear();
                    let hours = d.getHours();
                    const minutes = String(d.getMinutes()).padStart(2, "0");
                    const ampm = hours >= 12 ? "PM" : "AM";
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    const hoursStr = String(hours).padStart(2, "0");
                    return `${day}-${month}-${year} ${hoursStr}:${minutes} ${ampm}`;
                  };

                  const stagesSequence = [
                    'Raw Footage Received',
                    'Editor Assigned',
                    'Editing Started',
                    'Editing In Progress',
                    'Internal QC Review',
                    'Client Review Sent',
                    'Revision Required',
                    'Revision In Progress',
                    'Final Approval',
                    'Project Delivered',
                    'Completed'
                  ];

                  return (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSaving(true);
                        try {
                          const updates: any = {
                            editing_status: selectedStage,
                          };

                          // Map dynamic fields to remarks or specific fields
                          if (selectedStage === 'Internal QC Review') {
                            updates.remarks = qcNotes;
                          } else if (selectedStage === 'Client Review Sent') {
                            updates.remarks = reviewNotes;
                            updates.raw_footage_location = reviewLink || activeWorkflowProd.raw_footage_location;
                          } else if (selectedStage === 'Revision Required') {
                            updates.remarks = revisionNotes;
                            updates.expected_delivery_date = revisionDeadline || activeWorkflowProd.expected_delivery_date;
                            updates.target_delivery_date = revisionDeadline || activeWorkflowProd.target_delivery_date;
                          } else if (selectedStage === 'Revision In Progress') {
                            updates.remarks = revisionComments;
                          } else if (selectedStage === 'Final Approval') {
                            updates.remarks = approvalNotes;
                          } else if (selectedStage === 'Project Delivered') {
                            updates.remarks = `Delivered via ${deliveryLink}`;
                            updates.delivery_date = deliveryDate || new Date().toISOString().split('T')[0];
                            updates.raw_footage_location = deliveryLink || activeWorkflowProd.raw_footage_location;
                          } else if (selectedStage === 'Completed') {
                            updates.remarks = closingNotes;
                          }

                          // Execute update
                          await updateProduction(activeWorkflowProd.production_id, updates);

                          const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                          const targetOrderId = order?.order_id || activeWorkflowProd.order_id || activeWorkflowProd.tracking_id || activeWorkflowProd.lead_id || lead?.lead_id;
                          if (targetOrderId && updateOrderStage && selectedStage) {
                            await updateOrderStage(targetOrderId, selectedStage as any);
                          }

                          // Close the modal
                          setActiveWorkflowProd(null);
                          setWorkflowActionType(null);
                        } catch (err: any) {
                          console.error("Failed to update status:", err);
                          alert("Failed to update status: " + (err.message || err));
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="flex flex-col"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
                        
                        {/* LEFT COLUMN: CRM Inputs and Cards */}
                        <div className="space-y-4">
                          {/* CRM Information Cards */}
                          <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Order ID:</span>
                              <span className="text-zinc-350 font-bold font-mono">{orderId}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Customer Name:</span>
                              <span className="text-zinc-300 font-bold">{customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Event Type:</span>
                              <span className="text-zinc-300 font-semibold">{order?.event_type || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Event Date:</span>
                              <span className="text-zinc-300 font-mono">{order?.event_date || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Assigned Team:</span>
                              <span className="text-violet-400 font-bold">
                                {getAssignedEditorsList(activeWorkflowProd).length > 0 ? (
                                  <span 
                                    onClick={() => setAssignedEditorsModalProd(activeWorkflowProd)}
                                    className="cursor-pointer text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                                  >
                                    👥 {getAssignedEditorsList(activeWorkflowProd).length}
                                  </span>
                                ) : 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Current Status:</span>
                              <span className="text-amber-400 font-mono font-black">{activeWorkflowProd.editing_status}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-550 font-mono">Delivery Target Date:</span>
                              <span className="text-purple-400 font-mono font-bold">{activeWorkflowProd.target_delivery_date || '—'}</span>
                            </div>
                            <div className="flex flex-col pt-2 border-t border-zinc-900">
                              <span className="text-zinc-550 font-mono mb-1">Raw Footage Link:</span>
                              {(() => {
                                const rawLink = getRawFootageDriveLink(activeWorkflowProd);
                                if (rawLink) {
                                  const fullHref = rawLink.startsWith('http') ? rawLink : `https://${rawLink}`;
                                  return (
                                    <a 
                                      href={fullHref} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="text-cyan-400 hover:underline break-all font-mono text-[10px]"
                                    >
                                      {rawLink}
                                    </a>
                                  );
                                }
                                return <span className="text-zinc-600 italic font-mono text-[10px]">No Link Attached</span>;
                              })()}
                            </div>
                          </div>

                          {/* Dropdown status changer */}
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                              Update Status
                            </label>
                            <select
                              value={selectedStage}
                              onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                              className="w-full bg-zinc-900 border border-zinc-850 rounded-xl py-2.5 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono cursor-pointer"
                            >
                              <option value="Assigned Editor">Assigned Editor</option>
<option value="Editing Started">Editing Started</option>
<option value="Customer Review">Customer Review</option>
<option value="Editing Completed">Editing Completed</option>
<option value="Client Acceptance">Client Acceptance</option>
                            </select>
                          </div>

                          {/* Dynamic CRM Fields based on Status Choice */}
                          {selectedStage === 'Internal QC Review' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  QC Notes
                                </label>
                                <textarea
                                  value={qcNotes}
                                  onChange={(e) => setQcNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Describe internal QC findings or checks remaining..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Client Review Sent' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Review Link
                                </label>
                                <input
                                  type="text"
                                  value={reviewLink}
                                  onChange={(e) => setReviewLink(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                  placeholder="https://clientreview.com/album..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Review Notes
                                </label>
                                <textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  rows={2}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="E.g., Sent layout via portal..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Revision Required' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Notes
                                </label>
                                <textarea
                                  value={revisionNotes}
                                  onChange={(e) => setRevisionNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Detail what client has requested to change..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Deadline
                                </label>
                                <input
                                  type="date"
                                  value={revisionDeadline}
                                  onChange={(e) => setRevisionDeadline(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-855 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Revision In Progress' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Revision Update Notes
                                </label>
                                <textarea
                                  value={revisionComments}
                                  onChange={(e) => setRevisionComments(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Detail revision workflows or specific editor remarks..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Final Approval' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Approval Notes
                                </label>
                                <textarea
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Notes from customer approval loop..."
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Project Delivered' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Delivery Link
                                </label>
                                <input
                                  type="text"
                                  value={deliveryLink}
                                  onChange={(e) => setDeliveryLink(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                  placeholder="Google Drive, WeTransfer, or Album delivery link..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Delivery Date
                                </label>
                                <input
                                  type="date"
                                  value={deliveryDate}
                                  onChange={(e) => setDeliveryDate(e.target.value)}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                                />
                              </div>
                            </div>
                          )}

                          {selectedStage === 'Completed' && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 font-mono">
                                  Closing Notes
                                </label>
                                <textarea
                                  value={closingNotes}
                                  onChange={(e) => setClosingNotes(e.target.value)}
                                  rows={3}
                                  className="w-full bg-zinc-900 border border-zinc-850 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  placeholder="Closing summaries, archive drives, or delivery receipts..."
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* RIGHT COLUMN: Live Production Timeline */}
                        <div className="space-y-4 md:border-l md:border-zinc-900/60 md:pl-6 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1 font-mono">
                                Complete Production Timeline
                              </span>
                              <h4 className="text-xs font-bold text-zinc-300">
                                Milestones & Ledger Tracking
                              </h4>
                            </div>

                            <div className="overflow-y-auto max-h-[380px] p-1.5 pr-2 space-y-4">
                              {stagesSequence.map((stageName, idx) => {
                                const matchedLog = findLogForStage(stageName);
                                const isCurrent = activeWorkflowProd.editing_status === stageName;
                                const isDone = !!matchedLog || isCurrent;

                                return (
                                  <div key={stageName} className="flex gap-3 relative">
                                    {/* Line connecting milestones */}
                                    {idx < stagesSequence.length - 1 && (
                                      <div className={`absolute left-2.5 top-5 bottom-0 w-[1px] transition-colors ${
                                        isDone ? 'bg-gradient-to-b from-sky-500 to-zinc-900' : 'bg-zinc-900'
                                      }`} />
                                    )}

                                    {/* Icon Indicator Dot */}
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-sans shrink-0 z-10 transition-all ${
                                      isDone
                                        ? 'bg-sky-500/10 border border-sky-500 text-sky-400 font-extrabold shadow-[0_0_8px_rgba(14,165,233,0.25)]'
                                        : isCurrent
                                          ? 'bg-amber-500/10 border border-amber-500 text-amber-500 animate-pulse font-extrabold'
                                          : 'bg-zinc-900/80 border border-zinc-850 text-zinc-600'
                                    }`}>
                                      {isDone ? '✓' : idx + 1}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 pr-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className={`text-[11px] font-bold font-mono transition-colors ${
                                          isCurrent 
                                            ? 'text-amber-400 font-extrabold' 
                                            : isDone 
                                              ? 'text-zinc-200' 
                                              : 'text-zinc-650'
                                        }`}>
                                          {stageName}
                                        </span>
                                        {matchedLog && (
                                          <span className="text-[9px] font-mono text-zinc-500 text-right">
                                            {formatTimelineTimestamp(matchedLog.timestamp)}
                                          </span>
                                        )}
                                      </div>
                                      {matchedLog && matchedLog.action && (
                                        <p className="text-[9px] text-zinc-500 italic mt-0.5 font-mono line-clamp-1">
                                          {matchedLog.action.replace(`Updated Production ${activeWorkflowProd.production_id}: `, '')}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2 justify-end p-5 border-t border-zinc-900 bg-zinc-900/20">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                          }}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-mono uppercase text-[10px] tracking-wider rounded-lg transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-2 bg-gradient-to-r from-blue-650 to-indigo-650 hover:from-blue-600 hover:to-indigo-600 text-white font-mono uppercase text-[10px] tracking-wider rounded-lg transition-all font-black shadow-lg disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save Status Update'}
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {/* FORM: Close Project popup */}
                {workflowActionType === 'close_project' && activeWorkflowProd && (() => {
                  return (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (!selectedStage) {
                        alert("Please select project status");
                        return;
                      }

                      const currentOrder = (orders || []).find(o => o.order_id === activeWorkflowProd.tracking_id || o.lead_id === activeWorkflowProd.tracking_id);
                      const currentLead = (leads || []).find(l => l.lead_id === (currentOrder?.lead_id || activeWorkflowProd.tracking_id));
                      const currentPayment = (payments || []).find(p => p.order_id === (currentOrder?.order_id || activeWorkflowProd.tracking_id) || p.lead_id === (currentLead?.lead_id));

                      const validation = performBusinessOwnerReview(currentOrder, currentLead, activeWorkflowProd, currentPayment);

                      if (!validation.isValid) {
                        alert(validation.message);
                        updateProduction(activeWorkflowProd.production_id, {
                          editing_status: 'Business Owner Review',
                          remarks: `Business Owner Review Pending: ${validation.pendingItems.join('; ')}`
                        });
                        setActiveWorkflowProd(null);
                        setWorkflowActionType(null);
                        return;
                      }

                      updateProduction(activeWorkflowProd.production_id, {
                        editing_status: 'Order Closed',
                        remarks: closingNotes || activeWorkflowProd.remarks,
                        delivery_date: deliveryDate || new Date().toISOString().split('T')[0]
                      });

                      setActiveWorkflowProd(null);
                      setWorkflowActionType(null);
                    }} className="space-y-2.5">
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                            Project ID
                          </label>
                          <div className="text-zinc-200 text-xs font-mono">{activeWorkflowProd.tracking_id}</div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                            Client
                          </label>
                          <div className="text-zinc-200 text-xs font-mono">{customerName}</div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-0.5 font-mono">
                          Current Status
                        </label>
                        <div className="text-amber-400 font-mono text-xs">{activeWorkflowProd.editing_status}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Update Status *
                          </label>
                          <select
                            value={selectedStage}
                            onChange={(e) => setSelectedStage(e.target.value as EditingStatus)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                            required
                          >
                            <option value="" disabled>Select status...</option>
                            <option value="Assigned Editor">Assigned Editor</option>
<option value="Editing Started">Editing Started</option>
<option value="Customer Review">Customer Review</option>
<option value="Editing Completed">Editing Completed</option>
<option value="Client Acceptance">Client Acceptance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                            Completion Date
                          </label>
                          <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-850 rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1 font-mono">
                          Completion Notes
                        </label>
                        <textarea
                          autoFocus
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="Add any final notes or archive links..."
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkflowProd(null);
                            setWorkflowActionType(null);
                          }}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white font-mono uppercase text-[9px] tracking-wider rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white font-mono uppercase text-[9px] tracking-wider rounded-lg transition-all font-black shadow-lg"
                        >
                          Save 
                        </button>
                      </div>
                    </form>
                  );
                })()}

              </div>
            </div>
          </div>
        );
      })()}

      
    </>
  );
};
