const fs = require('fs');
const file = 'src/components/ProductionStaffModule.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `
    // Overall status per grouped task
    return Array.from(groupsMap.values()).map(grp => {
      const ranks = grp.deliverables.map((d: any) => getTaskStageRank(d.status, d.editedDriveLink));
      const minRank = Math.min(...ranks);

      let overallStatus = 'Assigned Editor';
      if (minRank >= 5) overallStatus = 'Client Acceptance';
      else if (minRank >= 4) overallStatus = 'Editing Completed';
      else if (minRank >= 3) overallStatus = 'Customer Review';
      else if (minRank >= 2) overallStatus = 'Editing Started';
      else if (minRank >= 1) overallStatus = 'Assigned Editor';

      const uniqueEventNames = Array.from(new Set(grp.deliverables.map((d: any) => d.eventName).filter(Boolean)));
      const displayName = uniqueEventNames.join(', ') || 'Unnamed Event';
      const eventCount = uniqueEventNames.length || 1;

      const uniqueEventDates = Array.from(new Set(grp.deliverables.map((d: any) => d.eventDate).filter(Boolean)));
      const displayDate = uniqueEventDates.join(', ') || grp.eventDate;

      const completedCount = grp.deliverables.filter((d: any) => ['Completed', 'Editing Complete', 'Editing Completed', 'Client Acceptance', 'Order Closed'].includes(d.status)).length;
      const progressText = \`\${completedCount}/\${grp.deliverables.length} deliverables complete\`;
`;

const newLogic = `
    // Overall status per grouped task
    return Array.from(groupsMap.values()).map(grp => {
      // ORDER STATUS MUST REFLECT ALL DELIVERABLES FOR THE ORDER assigned to this staff member
      const allOrderDeliverables = individualDeliverables.filter(d => d.orderId === grp.orderId);
      const ranks = allOrderDeliverables.map((d: any) => getTaskStageRank(d.status, d.editedDriveLink));
      const minRank = ranks.length > 0 ? Math.min(...ranks) : 1;

      let overallStatus = 'Assigned Editor';
      if (minRank >= 5) overallStatus = 'Client Acceptance';
      else if (minRank >= 4) overallStatus = 'Editing Completed';
      else if (minRank >= 3) overallStatus = 'Customer Review';
      else if (minRank >= 2) overallStatus = 'Editing Started';
      else if (minRank >= 1) overallStatus = 'Assigned Editor';

      const uniqueEventNames = Array.from(new Set(grp.deliverables.map((d: any) => d.eventName).filter(Boolean)));
      const displayName = uniqueEventNames.join(', ') || 'Unnamed Event';
      const eventCount = uniqueEventNames.length || 1;

      const uniqueEventDates = Array.from(new Set(grp.deliverables.map((d: any) => d.eventDate).filter(Boolean)));
      const displayDate = uniqueEventDates.join(', ') || grp.eventDate;

      const completedCount = allOrderDeliverables.filter((d: any) => ['Completed', 'Editing Complete', 'Editing Completed', 'Client Acceptance', 'Order Closed'].includes(d.status)).length;
      const progressText = \`\${completedCount}/\${allOrderDeliverables.length} DELIVERABLES COMPLETE\`;
`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
console.log('patched');
