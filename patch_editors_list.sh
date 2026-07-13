cat << 'INNEREOF' > editors_list_replacement.txt
  const getAssignedEditorsList = (prod: Production) => {
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
    }
    const staffStr = prod.assigned_staff || prod.editor_assigned;
    if (staffStr && staffStr !== 'Unassigned') {
      return staffStr.split(',').map(s => {
        const name = s.trim();
        const staffRec = (productionStaff || []).find(st => st.name === name);
        return {
          name,
          deliverable: 'Assigned',
          role: staffRec?.role || staffRec?.production_role_speciality || 'Editor',
          mobile: staffRec?.mobile || 'N/A',
          type: staffRec?.staff_type || (staffRec as any)?.Staff_Type || 'In-House',
          status: staffRec?.status || 'Active',
          deliverables: ['Assigned']
        };
      });
    }
    return [];
  };
INNEREOF

# Replace in src/components/ProductionModule.tsx
awk '
  /const getAssignedEditorsList = \(prod: Production\) => \{/ {
    print
    system("cat editors_list_replacement.txt | sed 1d")
    skip=1
    next
  }
  skip && /^  \};/ {
    skip=0
    next
  }
  !skip { print }
' src/components/ProductionModule.tsx > tmp.tsx && mv tmp.tsx src/components/ProductionModule.tsx
