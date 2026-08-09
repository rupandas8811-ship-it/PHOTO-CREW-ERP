const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const targetStr = `  const handleOpenAssignEditor = (prod: Production) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    setActiveWorkflowProd(prod);
    setWfError('');
    
    // Parse target delivery date
    const expected = prod.expected_delivery_date ? new Date(prod.expected_delivery_date) : null;
    const existingDate = prod.target_delivery_date || (expected ? expected.toISOString().split('T')[0] : '');
    setWfTargetDeliveryDate(existingDate);
    
    // Build deliverables from lead/order
    const { order, lead } = resolveOrderAndLead(prod);
    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';
    if (!deliverablesText && lead) {
      const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
      targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const targetLatestQuote = targetLeadQuotations[0];
      if (targetLatestQuote) {
        deliverablesText = targetLatestQuote.deliverables_description || '';
      }
    }
    const parsedDeliverables = parseExactDeliverables(deliverablesText, prod.custom_event_name, prod.event_id);
    
    const assignedForThis = (editorAssignments || []).filter(a => a.production_id === prod.production_id && (!a.event_id || a.event_id === prod.event_id));
    
    const tempMap = new Map<string, { qty: number; text: string; editor: string; assignment_id?: string; status?: string }>();
    const usedAssignments = new Set<string>();
    
    for (const d of parsedDeliverables) {
      const { qty, text } = parseQtyAndText(d);
      if (text) {
        const existing = tempMap.get(text);
        if (existing) {
          existing.qty += qty;
        } else {
          // Find existing assignment for this text
          const existingAssignment = assignedForThis.find(a => a.speciality === text && !usedAssignments.has(a.assignment_id));
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
    
    const assignments = Array.from(tempMap.values());
    
    setWfDeliverableAssignments(assignments);
    setWfProjectNotes(prod.project_notes || prod.remarks || '');
    setWorkflowActionType('assign_editor');
  };`;

const replacementStr = `  const [wfSelectedEventId, setWfSelectedEventId] = useState<string | null>(null);

  const loadAssignmentsForEvent = (prod: Production & { all_events?: any[] }, eventId: string) => {
    // Parse target delivery date for this event
    const evtAssignments = (editorAssignments || []).filter(a => a.production_id === prod.production_id && (!a.event_id || a.event_id === eventId));
    
    let computedTargetDate = '';
    if (evtAssignments.length > 0 && evtAssignments[0].target_finish_date) {
        computedTargetDate = evtAssignments[0].target_finish_date;
    } else {
        const expected = prod.expected_delivery_date ? new Date(prod.expected_delivery_date) : null;
        computedTargetDate = prod.target_delivery_date || (expected ? expected.toISOString().split('T')[0] : '');
    }
    setWfTargetDeliveryDate(computedTargetDate);

    // Build deliverables from lead/order FOR THIS EVENT
    const { order, lead } = resolveOrderAndLead(prod);
    let deliverablesText = order?.deliverables_description || lead?.deliverables_description || '';
    if (!deliverablesText && lead) {
      const targetLeadQuotations = quotations?.filter((q: any) => q.lead_id === lead.lead_id) || [];
      targetLeadQuotations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const targetLatestQuote = targetLeadQuotations[0];
      if (targetLatestQuote) {
        deliverablesText = targetLatestQuote.deliverables_description || '';
      }
    }
    
    const evtObj = prod.all_events?.find(e => e?.id === eventId) || null;
    const evtName = evtObj ? (evtObj.event_name || evtObj.event_type) : prod.custom_event_name;
    const parsedDeliverables = parseExactDeliverables(deliverablesText, evtName, eventId);
    
    const tempMap = new Map<string, { qty: number; text: string; editor: string; assignment_id?: string; status?: string }>();
    const usedAssignments = new Set<string>();
    
    for (const d of parsedDeliverables) {
      const { qty, text } = parseQtyAndText(d);
      if (text) {
        const existing = tempMap.get(text);
        if (existing) {
          existing.qty += qty;
        } else {
          // Find existing assignment for this text
          const existingAssignment = evtAssignments.find(a => a.speciality === text && !usedAssignments.has(a.assignment_id));
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
    
    const assignments = Array.from(tempMap.values());
    setWfDeliverableAssignments(assignments);
  };

  const handleOpenAssignEditor = (prod: Production & { all_events?: any[] }) => {
    if (prod.production_status === 'Order Closed' || prod.editing_status === 'Order Closed') return;
    setActiveWorkflowProd(prod);
    setWfError('');
    setWfProjectNotes(prod.project_notes || prod.remarks || '');
    setWorkflowActionType('assign_editor');
    
    const firstEventId = (prod.all_events && prod.all_events.length > 0 && prod.all_events[0]) ? prod.all_events[0].id : (prod.event_id || 'EVT-01');
    setWfSelectedEventId(firstEventId);
    loadAssignmentsForEvent(prod, firstEventId);
  };`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(targetStr, replacementStr));
  console.log("Successfully patched event load logic!");
} else {
  console.log("Target not found!");
}
