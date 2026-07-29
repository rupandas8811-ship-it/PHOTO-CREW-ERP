const fs = require('fs');
let content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

const targetStr = `  // Submit Equipment Photos & Update Task Status
  const handleConfirmStatusUpdate = async () => {`;

const endStr = `  // Calendar View & Navigation state`;

const startIndex = content.indexOf(targetStr);
const endIndex = content.indexOf(endStr);

const originalConfirm = content.substring(startIndex, endIndex);

const newConfirm = `  // Submit Equipment Photos & Update Task Status
  const handleConfirmStatusUpdate = async () => {
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

    // 1. Validate photo exists
    for (const item of reqItems) {
      if (!modalPhotos[item.name]) {
        showToast(\`⚠️ Please capture/upload a photo for \${item.name}\`);
        return;
      }
    }

    try {
      // 2. Set loading = true
      setIsSubmitting(true);
      const timestamp = new Date().toISOString();
      const uploadedProofs: EquipmentProofItem[] = [];

      // 3. Upload the selected image to the existing Supabase Storage bucket
      for (const item of reqItems) {
        let finalUrl = modalPhotos[item.name];
        
        if (finalUrl && finalUrl.startsWith('data:image')) {
          const res = await fetch(finalUrl);
          const blob = await res.blob();
          const fileName = \`proofs/\${booking.orderId}_\${stage.replace(/\\s+/g, '_')}_\${Date.now()}.jpg\`;
          
          const { data, error } = await supabaseClient.storage.from('img').upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
          
          // 4. WAIT for upload result.
          // 5. If upload fails, throw error
          if (error) {
            console.error("Storage upload error:", error);
            throw new Error(\`Upload failed: \${error.message}\`);
          }
          
          const { data: { publicUrl } } = supabaseClient.storage.from('img').getPublicUrl(data.path);
          finalUrl = publicUrl;
        }
        
        uploadedProofs.push({
          equipmentName: item.name,
          assetId: item.assetId,
          photoUrl: finalUrl,
          capturedAt: timestamp
        });
      }

      const newProofs: EquipmentProofItem[] = uploadedProofs;

      // 6 & 7. Save Equipment Received verification state & Save Equipment Received timestamp.
      if (supabaseClient) {
        for (const p of newProofs) {
          const { data: addData, error: dbErr } = await supabaseClient.from('lead_equipment_history').insert([{
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
            }),
            photo_url: p.photoUrl,
            event_id: booking.eventId,
            event_name: booking.eventName,
            asset_id: p.assetId,
            proof_type: stage
          }]).select();

          if (dbErr) {
            console.error('Error saving to lead_equipment_history:', dbErr);
            throw new Error(\`Database save failed: \${dbErr.message}\`);
          }
        }
      }

      // 9 & 10 & 11. Confirm the database update succeeded. Refresh/update local state. Change action.
      // Update staff status - also save 'Equipment Received' or 'Equipment Handover'
      let nextStatus = staffStatuses[booking.key] || 'Event Scheduled';
      if (stage === 'Event Start') {
        nextStatus = 'Event Started';
      } else if (stage === 'Event Complete') {
        nextStatus = 'Event Completed';
      } else {
        nextStatus = stage; // 'Equipment Received' or 'Equipment Handover'
      }

      const nextStatuses = {
        ...staffStatuses,
        [booking.key]: nextStatus
      };
      setStaffStatuses(nextStatuses);
      localStorage.setItem('staff_event_statuses_v2', JSON.stringify(nextStatuses));

      // Update local proof storage so UI updates instantly
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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('staff_status_updated'));
      }

      if (supabaseClient && booking.orderId) {
        // Update the individual staff assignment task_status
        const { data: updateData, error: updateErr } = await supabaseClient
          .from('staff_assignments')
          .update({
            task_status: nextStatus,
            updated_by: staffName,
            updated_at: timestamp
          })
          .eq('order_id', booking.orderId)
          .ilike('staff_name', staffName)
          .select();

        if (updateErr) {
          throw new Error(\`Failed to update assignment: \${updateErr.message}\`);
        }
        
        if (!updateData || updateData.length === 0) {
          throw new Error(\`No matching assignment found for Order ID: \${booking.orderId} and Staff: \${staffName}\`);
        }

        // Only sync global operations status if Event Start or Event Complete
        if (stage === 'Event Start' || stage === 'Event Complete') {
          const { data: allStaffAssignments } = await supabaseClient
            .from('staff_assignments')
            .select('task_status')
            .eq('order_id', booking.orderId);

          if (allStaffAssignments && allStaffAssignments.length > 0) {
            const allReachedStarted = allStaffAssignments.every(a => ['Event Started', 'Event Completed'].includes(a.task_status));
            const allReachedCompleted = allStaffAssignments.every(a => a.task_status === 'Event Completed');
            
            let globalNextStatus = null;
            if (allReachedCompleted) {
              globalNextStatus = 'Event Completed';
            } else if (allReachedStarted) {
              globalNextStatus = 'Event Started';
            }
            
            if (globalNextStatus) {
              await supabaseClient
                .from('operations')
                .update({ 
                   event_status: globalNextStatus,
                  remarks: \`Updated by System: All staff reached \${globalNextStatus}\`
                })
                .eq('order_id', booking.orderId);

              if (booking.leadId) {
                await updateLead(booking.leadId, { status: globalNextStatus as any });
              }
            }
          }
        }
      }

      // 13. CLOSE the Equipment Verification popup automatically.
      setPhotoModalData(null);
      setModalPhotos({});
      showToast(\`✅ \${stage} saved successfully!\`);

    } catch (error: any) {
      console.error('Error updating status:', error);
      showToast(\`❌ \${error.message || 'Failed to update status.'}\`);
    } finally {
      // 12. Set loading = false.
      setIsSubmitting(false);
    }
  };
`;

const updatedContent = content.replace(originalConfirm, newConfirm);
fs.writeFileSync('src/components/StaffModule.tsx', updatedContent);

console.log("Patched Confirm");
