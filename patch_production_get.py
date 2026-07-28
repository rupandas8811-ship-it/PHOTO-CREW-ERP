import re

with open('src/components/ProductionModule.tsx', 'r') as f:
    text = f.read()

get_assigned = """  const getAssignedEditorsList = (prod: Production) => {
    const fromAssignments = (editorAssignments || []).filter(a => a.production_id === prod.production_id);
    if (fromAssignments.length > 0) {
      return fromAssignments.map(a => {
        const staffRec = (productionStaff || []).find(s => s.staff_id === a.staff_id || s.name === a.staff_name);
        return {
          name: a.staff_name,
          deliverables: [a.speciality].filter(Boolean),
          deliverable: a.speciality || 'Assigned',
          role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
          mobile: staffRec?.mobile || 'N/A',
          type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
          status: a.status || 'Editor Assigned'
        };
      });
    }"""

old_get_assigned = """  const getAssignedEditorsList = (prod: Production) => {
    const fromAssignments = (editorAssignments || []).filter(a => a.production_id === prod.production_id);
    if (fromAssignments.length > 0) {
      const grouped = new Map<string, any>();
      fromAssignments.forEach(a => {
        if (!grouped.has(a.staff_name)) {
          const staffRec = (productionStaff || []).find(s => s.staff_id === a.staff_id || s.name === a.staff_name);
          grouped.set(a.staff_name, {
            name: a.staff_name,
            deliverables: [a.speciality].filter(Boolean),
            role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
            mobile: staffRec?.mobile || 'N/A',
            type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
            status: staffRec?.status || 'Active'
          });
        } else {
          const existing = grouped.get(a.staff_name);
          if (a.speciality && !existing.deliverables.includes(a.speciality)) {
             existing.deliverables.push(a.speciality);
          }
        }
      });
      return Array.from(grouped.values()).map(item => ({
         ...item,
         deliverable: item.deliverables.join(', ')
      }));
    }"""

text = text.replace(old_get_assigned, get_assigned)

with open('src/components/ProductionModule.tsx', 'w') as f:
    f.write(text)
