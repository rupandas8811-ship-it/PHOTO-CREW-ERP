const fs = require('fs');
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
let lines = content.split('\n');

const correctText = `      const fromAssignments = (editorAssignments || []).filter(a => a.production_id === prod.production_id && (!prod.event_id || !a.event_id || a.event_id === prod.event_id));
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
      const newAssignments: any[] = [];`;

lines.splice(1391, 22, correctText);

fs.writeFileSync('src/components/ProductionModule.tsx', lines.join('\n'));
console.log("Fixed lines 1391 to 1412");
