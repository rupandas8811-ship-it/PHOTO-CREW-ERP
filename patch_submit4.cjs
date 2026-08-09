const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const targetStr = content.substring(content.indexOf('const assignedForThis = (editorAssignments || [])'), content.indexOf('const newAssignments = [];'));

const replacementStr = `const targetEventId = wfSelectedEventId || activeWorkflowProd.event_id || activeWorkflowProd.all_events?.[0]?.id || 'EVT-01';
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
                      
                      `;

if (targetStr && targetStr.length > 0) {
  fs.writeFileSync('src/components/ProductionModule.tsx', content.replace(targetStr, replacementStr));
  console.log("Successfully patched submit via substring!");
} else {
  console.log("Target not found via substring!");
}
