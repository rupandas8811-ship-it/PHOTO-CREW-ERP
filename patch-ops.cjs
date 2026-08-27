const fs = require('fs');
const file = 'src/components/operations/OperationsLeads.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update isVerifiedFootageOrder to include all post-operation stages
const targetIsVerified = `  const isVerifiedFootageOrder = (o: Order) => {
    const stage = (o.current_stage || '').trim();
    if (stage === 'Verified Footage' || stage === 'Footage Handover Verified') {
      return true;
    }
    const lead = leads?.find(l => l.lead_id === o.lead_id || l.lead_id === o.order_id);
    if (lead) {
      const leadStatus = (lead.current_status || lead.status || '').trim();
      if (leadStatus === 'Verified Footage' || leadStatus === 'Footage Handover Verified') {
        return true;
      }
    }
    const op = operations?.find(op => op.order_id === o.order_id);
    if (op) {
      const opStatus = (op.event_status || '').trim();
      if (opStatus === 'Verified Footage' || opStatus === 'Footage Handover Verified') {
        return true;
      }
    }
    return false;
  };`;

const replacementIsVerified = `  const isVerifiedFootageOrder = (o: Order) => {
    const postOpStages = [
      'Verified Footage', 'Footage Handover Verified',
      'Raw Footage Received', 'Editor Assigned', 'Editing Started', 'Editing In Progress',
      'Internal QC Review', 'Client Review Sent', 'Internal Review', 'Client Review',
      'Revision Required', 'Revision In Progress', 'Revision', 'Final Approval',
      'Ready for Delivery', 'Project Delivered', 'Delivered', 'Project Completed', 'Completed', 'Order Closed'
    ];
    
    const stage = (o.current_stage || '').trim();
    if (postOpStages.includes(stage)) return true;

    const lead = leads?.find(l => l.lead_id === o.lead_id || l.lead_id === o.order_id);
    if (lead) {
      const leadStatus = (lead.current_status || lead.status || '').trim();
      if (postOpStages.includes(leadStatus)) return true;
    }

    const op = operations?.find(op => op.order_id === o.order_id);
    if (op) {
      const opStatus = (op.event_status || '').trim();
      if (postOpStages.includes(opStatus)) return true;
    }
    return false;
  };`;

content = content.replace(targetIsVerified, replacementIsVerified);

// 2. Remove isVerifiedFootageOrder from operationsOrders
const targetExclude = `    // Exclude records whose current status is Verified Footage from Operations active list/view
    if (isVerifiedFootageOrder(o)) return false;`;
content = content.replace(targetExclude, `    // Moved isVerifiedFootageOrder exclusion to filteredOrders for active view only`);

// 3. Add exclusion to filteredOrders when statusFilter === 'All'
const targetFilterAll = `      // 1. Status Dropdown filter
      if (statusFilter !== 'All') {`;
const replacementFilterAll = `      // 1. Status Dropdown filter
      if (statusFilter === 'All') {
        // Exclude records whose current status is Verified Footage (or beyond) from Operations active list/view
        if (isVerifiedFootageOrder(o)) return false;
      } else {`;
content = content.replace(targetFilterAll, replacementFilterAll);

fs.writeFileSync(file, content);
