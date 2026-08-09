const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const targetStr = `    // Fallback to editorAssignments if list is empty
    if (list.length === 0) {
      const targetEventId = wfSelectedEventId || activeWorkflowProd.event_id || activeWorkflowProd.all_events?.[0]?.id || 'EVT-01';
                      const assignedForThis = (editorAssignments || []).filter(a => a.production_id === activeWorkflowProd.production_id && (!a.event_id || a.event_id === targetEventId));
                      const isReassignment = assignedForThis.length > 0;

                      // 1. Delete all existing editor assignments for this production + event
                      let deleteQuery = supabaseClient
                        .from('editor_assignments')
                        .delete()
                        .eq('production_id', activeWorkflowProd.production_id)
                        .eq('event_id', targetEventId);
                        
                      const { error: deleteError } = await deleteQuery;
                            
                      if (deleteError) throw deleteError;
                          
                      // 2. Prepare and insert new assignments
                      const { order, lead } = resolveOrderAndLead(activeWorkflowProd);
                      const orderId = order?.order_id || activeWorkflowProd?.tracking_id || activeWorkflowProd?.production_id;
                      const eventId = targetEventId;
                        
                      const newAssignments = [];
      const activeStaffList = (productionStaff || []).filter(s => s.status === 'Active');`;

const replacementStr = `    // Fallback to editorAssignments if list is empty
    if (list.length === 0) {
      const fromAssignments = (editorAssignments || []).filter(a => a.production_id === prod.production_id && (!prod.event_id || !a.event_id || a.event_id === prod.event_id));
      if (fromAssignments.length > 0) {
        list = fromAssignments.map(a => ({ name: a.speciality || 'Assigned', qty: 1 }));
      }
    }
    
    // De-duplicate deliverables
    const unique = new Map<string, number>();
    list.forEach(item => {
      unique.set(item.name, (unique.get(item.name) || 0) + item.qty);
    });
    
    return Array.from(unique.entries()).map(([name, qty]) => ({ name, qty }));
  };

  const autoSaveAssignments = async (
    currentRowsMap: Record<string, Array<{ id: string; staffType: 'In-House' | 'Freelancer'; staffId: string }>>,
    targetDate: string
  ) => {
    if (!activeWorkflowProd) return;
    try {
      // 1. Delete all existing assignments for this production + event
      let deleteQuery = supabaseClient
        .from('editor_assignments')
        .delete()
        .eq('production_id', activeWorkflowProd.production_id);
      
      if (activeWorkflowProd.event_id) {
        deleteQuery = deleteQuery.eq('event_id', activeWorkflowProd.event_id);
      }
      
      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError;

      // 2. Prepare and insert new assignments
      const newAssignments = [];
      const activeStaffList = (productionStaff || []).filter(s => s.status === 'Active');`;

if (content.includes(targetStr)) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(targetStr, replacementStr));
  console.log("Fixed syntax error!");
} else {
  console.log("Could not find syntax error block!");
}
