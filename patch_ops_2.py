import re

with open('src/components/operations/OperationsLeads.tsx', 'r') as f:
    content = f.read()

# 3. Handle handleAssignSubmit
submit_old = """  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId || isSaving) return;
    
    // Validate required fields
    if (activeAssignments.length === 0) {
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

    // NEW: Equipment Validation
    if (!assignForm.equipment_kit) {
      alert('Please select at least one equipment kit/item.');
      return;
    }
    
    const kitsToAssign = assignForm.equipment_kit.split(',').map(s => s.trim()).filter(Boolean);
    for (const kitName of kitsToAssign) {
      const found = equipment.find(eq => eq.equipment_name === kitName);
      if (!found) {
        alert(`Equipment "${kitName}" not found in inventory.`);
        return;
      }
      if (found.status !== 'Available') {
        alert(`Equipment "${kitName}" is currently ${found.status} and cannot be assigned.`);
        return;
      }
    }

    try {
      setIsSaving(true);

      // First save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, activeAssignments);
      
      // Update data so that UI reflects new crew directly from lead_staff_assignment_history
      refreshData();

      // Update equipment status in real-time
      if (equipment && updateEquipment) {
        const op = getOpDetails(assigningOrderId);
        const previousKits = op?.equipment_kit ? op.equipment_kit.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const removedKits = previousKits.filter(pk => !selectedKits.includes(pk));
        
        for (const kitStr of removedKits) {
          const found = equipment.find(eq => eq.equipment_name === kitStr);
          if (found) {
            await updateEquipment(found.equipment_id, { status: 'Available' });
          }
        }

        for (const kitStr of selectedKits) {
          const found = equipment.find(eq => eq.equipment_name === kitStr);
          if (found) {
            await updateEquipment(found.equipment_id, { status: 'Assigned' });
            
            // NEW: Record History
            if (addLeadEquipmentHistory) {
              const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
              await addLeadEquipmentHistory({
                lead_id: matchedOrder?.lead_id || 'UNKNOWN',
                order_id: assigningOrderId,
                equipment_name: found.equipment_name,
                equipment_status: 'Assigned',
                remarks: `Assigned to order ${assigningOrderId} by ${currentUserName}`
              });
            }
          }
        }
      }

      // Map some main ones to assignForm variables for legacy column compatibility
      const photographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('photographer'))?.staff_name || '';
      const videographer = activeAssignments.find(a => a.staff_role.toLowerCase().includes('videographer'))?.staff_name || '';
      const droneOp = activeAssignments.find(a => a.staff_role.toLowerCase().includes('drone') || a.staff_role.toLowerCase().includes('aerial'))?.staff_name || '';
      const assistant = activeAssignments.find(a => a.staff_role.toLowerCase().includes('assistant'))?.staff_name || '';
      
      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
      
      // Set status to Event Scheduled as requested
      const targetStage: CurrentStage = 'Event Scheduled';
      console.log("Saving assignment for order:", assigningOrderId, {
        photographer,
        videographer,
        droneOp,
        assistant,
        equipment: assignForm.equipment_kit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        targetStage
      });

      // Assign operations includes event_status and raw footage link if updated
      await assignOperations(assigningOrderId, {
        photographer_assigned: photographer || assignForm.photographer_assigned || '',
        videographer_assigned: videographer || assignForm.videographer_assigned || '',
        drone_operator_assigned: droneOp || assignForm.drone_operator_assigned || '',
        assistant_assigned: assistant || assignForm.assistant_assigned || '',
        equipment_kit: assignForm.equipment_kit,
        reporting_time: convertTimeToDbFormat(assignForm.reporting_time),
        remarks: assignForm.remarks,
        event_status: targetStage,
        current_stage: targetStage,
        event_date: assignForm.event_date,
        event_time: convertTimeToDbFormat(assignForm.event_time),
        assigned_staff: activeAssignments.map(a => a.staff_name).join(', '),
        assigned_roles: activeAssignments.map(a => a.staff_role).join(', ')
      } as any);

      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          staffDetails: activeAssignments.map(a => `${a.staff_name} (${a.staff_role})`).join(', ') || 'No staff assigned.',
          equipmentDetails: assignForm.equipment_kit || 'None',
          reportingTime: assignForm.reporting_time,
          customerName: matchedOrder.customer_name
        });
        setShowSuccessModal(true);
      }

      setAssigningOrderId(null);
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving assignments.');
    } finally {
      setIsSaving(false);
    }
  };"""

submit_new = """  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrderId || isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Prepare staff assignments with event IDs appended to staff_role
      const allStaffAssignments: { staff_role: string; staff_id: string; staff_name: string }[] = [];
      const eventReporting: any = {};
      
      for (const [eid, data] of Object.entries(eventAllocations)) {
        data.staff.forEach(s => {
          allStaffAssignments.push({
            staff_role: `${s.staff_role}|${eid}`,
            staff_id: s.staff_id,
            staff_name: s.staff_name
          });
        });
        
        eventReporting[eid] = {
          reporting_date: data.reporting_date,
          reporting_time: data.reporting_time,
          event_start_time: data.event_start_time,
          event_end_time: data.event_end_time
        };
      }

      // First save the multi-staff role assignments to Supabase & Context state!
      await saveStaffAssignments(assigningOrderId, allStaffAssignments);
      
      // Save reporting information in operations remarks
      const targetStage: CurrentStage = 'Event Scheduled';
      const remarksJson = JSON.stringify({ event_reporting: eventReporting });
      
      await assignOperations(assigningOrderId, {
        photographer_assigned: '',
        videographer_assigned: '',
        drone_operator_assigned: '',
        assistant_assigned: '',
        equipment_kit: '',
        reporting_time: '08:00',
        remarks: remarksJson,
        event_status: targetStage,
        current_stage: targetStage
      } as any);

      refreshData();
      
      const matchedOrder = orders.find(o => o.order_id === assigningOrderId);
      if (matchedOrder) {
        setSuccessModalData({
          orderId: assigningOrderId,
          staffDetails: allStaffAssignments.length + ' staff assigned',
          equipmentDetails: 'N/A',
          reportingTime: 'Per Event',
          customerName: matchedOrder.customer_name
        });
        setShowSuccessModal(true);
      }

      setAssigningOrderId(null);
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving assignments.');
    } finally {
      setIsSaving(false);
    }
  };"""
content = content.replace(submit_old, submit_new)

with open('src/components/operations/OperationsLeads.tsx', 'w') as f:
    f.write(content)
print("done step 2")
