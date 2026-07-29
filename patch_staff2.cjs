const fs = require('fs');
const content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const targetFuncStart = content.indexOf('  const handleConfirmStatusUpdate = async () => {');
const targetFuncEnd = content.indexOf('  refreshData();', targetFuncStart);

if (targetFuncStart > -1 && targetFuncEnd > -1) {
  const replacement = `  const handleConfirmStatusUpdate = async () => {
    if (!photoModalData) return;

    const { booking, stage } = photoModalData;
    
    let reqItems: { name: string; assetId: string }[] = [];
    if (stage === 'Equipment Received') {
      reqItems = [{ name: 'Equipment Received Photo', assetId: 'Verification' }];
    } else if (stage === 'Event Start') {
      reqItems = [{ name: 'Event Start Photo', assetId: 'Verification' }];
    } else if (stage === 'Equipment Handover') {
      reqItems = [{ name: 'Equipment Handover Photo', assetId: 'Verification' }];
    } else if (stage === 'Event Complete') {
      reqItems = []; // No photo needed
    }

    // Verify photos if required
    for (const item of reqItems) {
      if (!modalPhotos[item.name]) {
        showToast(\`⚠️ Please capture/upload a photo for \${item.name}\`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const timestamp = new Date().toISOString();
      const newProofs: EquipmentProofItem[] = reqItems.map(item => ({
        equipmentName: item.name,
        assetId: item.assetId,
        photoUrl: modalPhotos[item.name],
        capturedAt: timestamp
      }));

      // Update local proof storage
      const existingProofs = staffProofs[booking.key] || {};
      
      const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                         stage === 'Event Start' ? 'eventStartProofs' :
                         stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                         'completeProofs';

      const updatedEventProofs = {
        ...existingProofs,
        [proofField]: newProofs
      };

      const nextProofs = {
        ...staffProofs,
        [booking.key]: updatedEventProofs
      };

      setStaffProofs(nextProofs);
      localStorage.setItem('staff_equipment_proofs_v2', JSON.stringify(nextProofs));

      // Update staff status
      // We only advance the status on Event Start and Event Complete
      let nextStatus = staffStatuses[booking.key] || 'Event Scheduled';
      if (stage === 'Event Start') {
        nextStatus = 'Event Started';
      } else if (stage === 'Event Complete') {
        nextStatus = 'Event Completed';
      }

      const nextStatuses = {
        ...staffStatuses,
        [booking.key]: nextStatus
      };

      setStaffStatuses(nextStatuses);
      localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_status_updated'));
      }

      // Save records into Supabase lead_equipment_history table for durability
      for (const p of newProofs) {
        try {
          await addLeadEquipmentHistory({
            lead_id: booking.leadId,
            order_id: booking.orderId,
            equipment_name: p.equipmentName,
            equipment_status: stage,
            returned_by: staffName,
            returned_at: timestamp,
            remarks: JSON.stringify({
              asset_id: p.assetId,
              proof_type: stage,
              staff_name: staffName,
              photo_url: p.photoUrl,
              event_id: booking.eventId,
              event_name: booking.eventName
            })
          });
        } catch (dbErr) {
          console.warn('Error saving to lead_equipment_history:', dbErr);
        }
      }

      // Sync status to operations table and staff_assignments table ONLY when status actually changes
      if (stage === 'Event Start' || stage === 'Event Complete') {
        try {
          if (supabaseClient && booking.orderId) {
            // 1. Update the individual staff assignment
            await supabaseClient
              .from('staff_assignments')
              .update({
                assignment_status: nextStatus,
                task_status: nextStatus,
                updated_by: staffName
              })
              .eq('order_id', booking.orderId)
              .ilike('staff_name', staffName);

            // 2. Fetch all current staff assignments for this order
            const { data: allStaffAssignments } = await supabaseClient
              .from('staff_assignments')
              .select('assignment_status')
              .eq('order_id', booking.orderId);

            if (allStaffAssignments && allStaffAssignments.length > 0) {
              const allReachedStarted = allStaffAssignments.every(a => ['Event Started', 'Event Completed'].includes(a.assignment_status));
              const allReachedCompleted = allStaffAssignments.every(a => a.assignment_status === 'Event Completed');
              
              let globalNextStatus = null;
              if (allReachedCompleted) {
                globalNextStatus = 'Event Completed';
              } else if (allReachedStarted) {
                globalNextStatus = 'Event Started';
              }
              
              if (globalNextStatus) {
                // Update operations status if unanimous
                await supabaseClient
                  .from('operations')
                  .update({ 
                    event_status: globalNextStatus,
                    remarks: \`Updated by System: All staff reached \${globalNextStatus}\`
                  })
                  .eq('order_id', booking.orderId);

                // Update lead status if unanimous
                if (booking.leadId) {
                  await updateLead(booking.leadId, { status: globalNextStatus as any });
                }
              }
            }
          }
        } catch (opErr) {
          console.warn('Syncing operation/staff status notice:', opErr);
        }
      }

      setPhotoModalData(null);
      setModalPhotos({});
      showToast(\`✅ \${stage} saved successfully!\`);
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('❌ Failed to update status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

`;
  const newContent = content.slice(0, targetFuncStart) + replacement + content.slice(targetFuncEnd + '  refreshData();\n  };\n'.length);
  fs.writeFileSync('src/components/StaffModule.tsx', newContent);
  console.log('Patched phase 2');
} else {
  console.log('Target not found');
}
