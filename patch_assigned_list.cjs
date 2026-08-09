const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const targetStr = `  const getAssignedEditorsList = (prod: Production) => {
    const fromAssignments = (editorAssignments || []).filter(a => 
      (a.production_id === prod.production_id ||
      a.production_id === (prod as any).order_id ||
      a.production_id === prod.tracking_id ||
      a.order_id === (prod as any).order_id ||
      a.order_id === prod.tracking_id) &&
      (!prod.event_id || !a.event_id || a.event_id === prod.event_id)
    );
    if (fromAssignments.length > 0) {
      const grouped = new Map<string, any>();
      fromAssignments.forEach(a => {
        const staffName = a.staff_name;
        if (!grouped.has(staffName)) {
          const staffRec = (productionStaff || []).find(s => s.staff_id === a.staff_id || s.name === staffName);
          grouped.set(staffName, {
            name: staffName,
            deliverables: [],
            role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
            mobile: staffRec?.mobile || 'N/A',
            type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
            status: a.status || 'Editor Assigned'
          });
        }
        if (a.speciality) {
          grouped.get(staffName).deliverables.push(a.speciality);
        }
      });
      return Array.from(grouped.values()).map(g => ({
        ...g,
        deliverable: g.deliverables.join(', ') || 'Assigned'
      }));
    }`;

const replacementStr = `  const getAssignedEditorsList = (prod: Production & { all_events?: any[] }) => {
    const isOrderLevel = prod.all_events && prod.all_events.length > 0;
    
    const fromAssignments = (editorAssignments || []).filter(a => 
      (a.production_id === prod.production_id ||
      a.production_id === (prod as any).order_id ||
      a.production_id === prod.tracking_id ||
      a.order_id === (prod as any).order_id ||
      a.order_id === prod.tracking_id) &&
      (isOrderLevel ? true : (!prod.event_id || !a.event_id || a.event_id === prod.event_id))
    );
    
    if (fromAssignments.length > 0) {
      const grouped = new Map<string, any>();
      fromAssignments.forEach(a => {
        const staffName = a.staff_name;
        if (!grouped.has(staffName)) {
          const staffRec = (productionStaff || []).find(s => s.staff_id === a.staff_id || s.name === staffName);
          grouped.set(staffName, {
            name: staffName,
            deliverables: [],
            role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
            mobile: staffRec?.mobile || 'N/A',
            type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
            status: a.status || 'Editor Assigned'
          });
        }
        
        if (a.speciality) {
          const evtName = prod.all_events?.find(e => e?.id === a.event_id)?.event_name || '';
          const suffix = evtName ? \` [\${evtName}]\` : '';
          grouped.get(staffName).deliverables.push(a.speciality + suffix);
        }
      });
      return Array.from(grouped.values()).map(g => ({
        ...g,
        deliverable: g.deliverables.join(', ') || 'Assigned'
      }));
    }`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(targetStr, replacementStr));
  console.log("Successfully patched getAssignedEditorsList");
} else {
  console.log("Target not found!");
}
