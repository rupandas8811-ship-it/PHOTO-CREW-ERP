import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

replacement = """  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId || isSaving) return;
    
    // Validate required fields
    const hasAnyAllocations = Object.values(eventAllocations).some((alloc: any) => alloc.staff && alloc.staff.length > 0);
    if (activeAssignments.length === 0 && !hasAnyAllocations) {
      alert("Please assign at least one staff member.");
      return;
    }
    if (!assignForm.event_date) {
      alert("Please select an event date.");
      return;
    }
    if (!assignForm.reporting_time) {
      alert("Please select a reporting time.");
      return;
    }

    // Equipment Availability Validation for the current assignment
    for (const [evId, alloc] of Object.entries(eventAllocations)) {
      const staffList = (alloc as any).staff || [];
      for (const st of staffList) {
        const eqList = st.equipment || [];
        for (const kitName of eqList) {
          const found = equipment.find(eq => eq.equipment_name.toLowerCase() === kitName.toLowerCase());
          if (!found) {
            alert(`Equipment "${kitName}" not found in inventory.`);
            return;
          }
          
          // Find the exact event to get its time
          const ev = parentLeadInstance?.events?.find((e: any) => e.id === evId);
          const tDate = ev?.event_date || assignForm.event_date;
          const tStart = ev?.event_start_time || ev?.reporting_time;
          const tEnd = ev?.event_end_time;
          
          const availability = checkEquipmentAvailability(kitName, assigningOrderId, tDate, tStart, tEnd);
          if (availability.isBusy) {
            let conflictMsg = `⚠️ Cannot Assign "${kitName}"\\n\\nIt is currently busy / assigned to another active order during the requested time:\\n${tDate || 'Unknown Date'} ${tStart || '?'} - ${tEnd || '?'}\\n\\n`;
            if (availability.conflicts && availability.conflicts.length > 0) {
              conflictMsg += "Conflicts:\\n";
              availability.conflicts.forEach((c: any) => {
                conflictMsg += `- Staff: ${c.staffName}, Event: ${c.eventName}, Time: ${c.startTime || '?'} - ${c.endTime || '?'}\\n`;
              });
            }
            alert(conflictMsg);
            return;
          }
        }
      }
    }
    const allAssignedEquipment = Array.from(
      new Set(
        Object.values(eventAllocations).flatMap((alloc: any) => 
          alloc.staff?.flatMap((st: any) => st.equipment || []) || []
        )
      )
    ) as string[];

    setAssignValidationError(null);
    setValidationAttempted(false);
    let overallMissingStaff = false;
    if (parentLeadInstance?.events) {
       const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === parentLeadInstance?.lead_id) || [];
       const teamMembersConfig = extractTeamMembersConfig(parentLeadInstance, targetLeadPkgs);
       const totalEvents = parentLeadInstance.events.length;

       for (let index = 0; index < parentLeadInstance.events.length; index++) {
          const ev = parentLeadInstance.events[index];
          const evId = ev.id || '';
          if (!evId) continue;
          
          const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig, totalEvents);
          
          if (includedRoles.length > 0) {
            const allocStaff = eventAllocations[evId]?.staff || [];
            const validAllocStaff = allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '');
            
            const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
            includedRoles.forEach((roleStr: string) => {
              const { qty, text } = parseQtyAndText(roleStr);
              const roleName = (text || roleStr).trim();
              if (!roleName) return;
              if (tasksMap.has(roleName)) {
                tasksMap.get(roleName)!.targetQty += (qty || 1);
              } else {
                tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
              }
            });

            let isMissingStaff = false;
            for (const task of Array.from(tasksMap.values())) {
              const assignedCount = validAllocStaff.filter((s: any) => s.staff_role === task.roleName).length;
              if (assignedCount < task.targetQty) {
                isMissingStaff = true;
                break;
              }
            }

            if (isMissingStaff) {
                overallMissingStaff = true;
            }
          }

          // NEW: Validate duplicate equipment per event
          const allocStaffForEq = eventAllocations[evId]?.staff || [];
          const equipmentCounts: Record<string, number> = {};
          allocStaffForEq.forEach((s: any) => {
             (s.equipment || []).forEach((eq: string) => {
                equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
             });
          });
          const duplicates = Object.keys(equipmentCounts).filter(eq => equipmentCounts[eq] > 1);
          if (duplicates.length > 0) {
              setValidationAttempted(true);
              setAssignValidationError(`This equipment is already assigned to another staff member for this event: ${duplicates.join(', ')}`);
              
              setCollapsedAssignEvents(prev => ({ ...prev, [evId]: false }));
              
              setTimeout(() => {
                const el = document.getElementById(`assign-event-${evId}`);
                if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950');
                   setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950'), 3000);
                }
              }, 100);
              return;
          }
       }
    }

    setIsSaving(true);
    try {"""

orig = """  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId || isSaving) return;
    
    // Validate required fields
    const hasAnyAllocations = Object.values(eventAllocations).some((alloc: any) => alloc.staff && alloc.staff.length > 0);
    if (activeAssignments.length === 0 && !hasAnyAllocations) {
      alert("Please assign at least one staff member.");
      return;
    }
    if (!assignForm.event_date) {
      alert("Please select an event date.");
      return;
    }
    if (!assignForm.reporting_time) {
      alert("Please select a reporting time.");
      return;
    }

    // Equipment Availability Validation for the current assignment
    for (const [evId, alloc] of Object.entries(eventAllocations)) {
      const staffList = (alloc as any).staff || [];
      for (const st of staffList) {
        const eqList = st.equipment || [];
        for (const kitName of eqList) {
          const found = equipment.find(eq => eq.equipment_name.toLowerCase() === kitName.toLowerCase());
          if (!found) {
            alert(`Equipment "${kitName}" not found in inventory.`);
            return;
          }
          
          // Find the exact event to get its time
          const ev = parentLeadInstance?.events?.find((e: any) => e.id === evId);
          const tDate = ev?.event_date || assignForm.event_date;
          const tStart = ev?.event_start_time || ev?.reporting_time;
          const tEnd = ev?.event_end_time;
          
          const availability = checkEquipmentAvailability(kitName, assigningOrderId, tDate, tStart, tEnd);
          if (availability.isBusy) {
            let conflictMsg = `⚠️ Cannot Assign "${kitName}"\\n\\nIt is currently busy / assigned to another active order during the requested time:\\n${tDate || 'Unknown Date'} ${tStart || '?'} - ${tEnd || '?'}\\n\\n`;
            if (availability.conflicts && availability.conflicts.length > 0) {
              conflictMsg += "Conflicts:\\n";
              availability.conflicts.forEach((c: any) => {
                conflictMsg += `- Staff: ${c.staffName}, Event: ${c.eventName}, Time: ${c.startTime || '?'} - ${c.endTime || '?'}\\n`;
              });
            }
            alert(conflictMsg);
            return;
          }
        }
      }
    }
    const allAssignedEquipment = Array.from(
      new Set(
        Object.values(eventAllocations).flatMap((alloc: any) => 
          alloc.staff?.flatMap((st: any) => st.equipment || []) || []
        )
      )
    ) as string[];

    setAssignValidationError(null);
    setValidationAttempted(false);
    let overallMissingStaff = false;
    if (parentLeadInstance?.events) {
       const targetLeadPkgs = leadPackages?.filter(lp => lp.lead_id === parentLeadInstance?.lead_id) || [];
       const teamMembersConfig = extractTeamMembersConfig(parentLeadInstance, targetLeadPkgs);
       const totalEvents = parentLeadInstance.events.length;

       for (let index = 0; index < parentLeadInstance.events.length; index++) {
          const ev = parentLeadInstance.events[index];
          const evId = ev.id || '';
          if (!evId) continue;
          
          const includedRoles = getEventRolesForEvent(ev, index, teamMembersConfig, totalEvents);
          
          if (includedRoles.length > 0) {
            const allocStaff = eventAllocations[evId]?.staff || [];
            const validAllocStaff = allocStaff.filter((s: any) => s.staff_name && s.staff_name.trim() !== '');
            
            const tasksMap = new Map<string, { roleName: string; targetQty: number }>();
            includedRoles.forEach((roleStr: string) => {
              const { qty, text } = parseQtyAndText(roleStr);
              const roleName = (text || roleStr).trim();
              if (!roleName) return;
              if (tasksMap.has(roleName)) {
                tasksMap.get(roleName)!.targetQty += (qty || 1);
              } else {
                tasksMap.set(roleName, { roleName, targetQty: qty || 1 });
              }
            });

            let isMissingStaff = false;
            for (const task of Array.from(tasksMap.values())) {
              const assignedCount = validAllocStaff.filter((s: any) => s.staff_role === task.roleName).length;
              if (assignedCount < task.targetQty) {
                isMissingStaff = true;
                break;
              }
            }

            if (isMissingStaff) {
                overallMissingStaff = true;
            }
          }

          // NEW: Validate duplicate equipment per event
          const allocStaffForEq = eventAllocations[evId]?.staff || [];
          const equipmentCounts: Record<string, number> = {};
          allocStaffForEq.forEach((s: any) => {
             (s.equipment || []).forEach((eq: string) => {
                equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
             });
          });
          const duplicates = Object.keys(equipmentCounts).filter(eq => equipmentCounts[eq] > 1);
          if (duplicates.length > 0) {
              setValidationAttempted(true);
              setAssignValidationError(`This equipment is already assigned to another staff member for this event: ${duplicates.join(', ')}`);
              
              setCollapsedAssignEvents(prev => ({ ...prev, [evId]: false }));
              
              setTimeout(() => {
                const el = document.getElementById(`assign-event-${evId}`);
                if (el) {
                   el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   el.classList.add('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950');
                   setTimeout(() => el.classList.remove('ring-2', 'ring-red-500', 'ring-offset-2', 'ring-offset-zinc-950'), 3000);
                }
              }, 100);
              return;
          }
       }
    }

    try {"""

content = content.replace(orig, replacement)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)

