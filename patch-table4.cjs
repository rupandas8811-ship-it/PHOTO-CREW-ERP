const fs = require('fs');

let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

const newHelpers = `  const getProductionStatus = (prod: any): string => {
    const status = (prod.editing_status || 'Verified Footage') as string;
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(status)) {
      const assignments = (editorAssignments || []).filter((a: any) => 
        a.production_id === prod.production_id ||
        a.production_id === (prod as any).order_id ||
        a.production_id === prod.tracking_id ||
        a.order_id === (prod as any).order_id ||
        a.order_id === prod.tracking_id
      );
      if (assignments && assignments.length > 0) return 'Assigned Editor';
      return 'Verified Footage';
    }
    if (['Editor Assigned', 'Assigned Editor', 'Assigned'].includes(status)) return 'Assigned Editor';
    if (['Editing Started', 'Editing', 'Editing In Progress'].includes(status)) return 'Editing Started';
    if (['Internal QC Review'].includes(status)) return 'Internal QC Review';
    if (['Ready For Review', 'Client Review Sent', 'Customer Review'].includes(status)) return 'Customer Review';
    if (['Editing Completed', 'Editing Complete'].includes(status)) return 'Editing Completed';
    if (['Client Acceptance'].includes(status)) return 'Client Acceptance';
    if (['Revision Required'].includes(status)) return 'Revision Required';
    if (['Revision In Progress'].includes(status)) return 'Revision In Progress';
    if (['Approved', 'Final Approval'].includes(status)) return 'Final Approval';
    if (['Delivered', 'Project Delivered', 'Payment Pending'].includes(status)) return 'Project Delivered';
    if (['Order Closed'].includes(status)) return 'Order Closed';
    if (['Closed', 'Project Closed', 'Completed', 'Project Completed'].includes(status)) return 'Completed';
    if (['Project Cancelled', 'Cancelled', 'Canceled'].includes(status)) return 'Project Cancelled';
    return status;
  };

  const getAutomatedProductionStatus = (prod: any): string => {
    const baseStatus = (prod.editing_status || 'Pending') as string;
    if (['Order Closed', 'Closed', 'Completed', 'Project Closed'].includes(baseStatus)) {
      return 'Order Closed';
    }
    if (baseStatus === 'Client Acceptance' || (prod as any).production_status === 'Client Acceptance' || (prod as any).current_status === 'Client Acceptance') {
      return 'Client Acceptance';
    }
    const assignments = (editorAssignments || []).filter((a: any) => 
      a.production_id === prod.production_id ||
      a.production_id === (prod as any).order_id ||
      a.production_id === prod.tracking_id ||
      a.order_id === (prod as any).order_id ||
      a.order_id === prod.tracking_id
    );
    if (assignments.length > 0) {
      const getTaskStageRank = (st: string, driveLink?: string) => {
        const status = st || '';
        if (['Client Acceptance'].includes(status)) return 5;
        if (['Completed', 'Editing Completed', 'Editing Complete'].includes(status)) return 4;
        if (['Customer Review', 'Client Review', 'Client Review Sent'].includes(status) || (driveLink && driveLink.trim() !== '')) return 3;
        if (['Editing Started', 'In Progress', 'Editing In Progress'].includes(status)) return 2;
        if (['Assigned Editor', 'Editor Assigned', 'Assigned'].includes(status)) return 1;
        return 0;
      };
      const ranks = assignments.map((a: any) => getTaskStageRank(a.status, (a as any).edited_drive_link));
      const minRank = Math.min(...ranks);
      if (minRank >= 5) return 'Client Acceptance';
      if (minRank >= 4) return 'Editing Completed';
      if (minRank >= 3) return 'Customer Review';
      if (minRank >= 2) return 'Editing Started';
      if (minRank >= 1) return 'Assigned Editor';
    }
    if (['Pending', 'Raw Footage Received', 'Verified Footage', 'Footage Handover Verified', 'Raw Footage Uploaded', 'Footage Handover', 'Assigned Crew', 'Staff Assigned', 'Crew Assigned', 'Operations Assigned', 'Event Scheduled', 'Event Started', 'Event Completed', 'Event Ended', 'New Project', 'New Project Arrived', 'Order Created', 'New Order', 'Confirm Order', 'Order Confirmed', 'Quotation Sent', 'Booking Requested', 'Follow Up', 'Follow-Up', 'New Lead'].includes(baseStatus)) {
      return 'Verified Footage';
    }
    return baseStatus;
  };
`;

code = code.replace("const isProductionStaffAssignment =", newHelpers + "\n  const isProductionStaffAssignment =");
fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
console.log('patched again');
