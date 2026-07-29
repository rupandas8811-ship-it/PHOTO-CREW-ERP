import sys

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target = """          // 2. Fetch all current staff assignments for this order
          const { data: allStaffAssignments } = await supabaseClient
            .from('staff_assignments')
            .select('assignment_status')
            .eq('order_id', booking.orderId);

          if (allStaffAssignments && allStaffAssignments.length > 0) {
            // Check if ALL assigned staff have the SAME nextStatus
            const allMatch = allStaffAssignments.every(a => a.assignment_status === nextStatus);
            
            if (allMatch) {
              // Update operations status if unanimous
              await supabaseClient
                .from('operations')
                .update({ 
                  event_status: nextStatus,
                  remarks: `Updated by System: All staff marked as ${nextStatus}`
                })
                .eq('order_id', booking.orderId);

              // Update lead status if unanimous
              if (booking.leadId) {
                await updateLead(booking.leadId, { status: nextStatus as any });
              }
            }
          }"""

replacement = """          // 2. Fetch all current staff assignments for this order
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
                  remarks: `Updated by System: All staff reached ${globalNextStatus}`
                })
                .eq('order_id', booking.orderId);

              // Update lead status if unanimous
              if (booking.leadId) {
                await updateLead(booking.leadId, { status: globalNextStatus as any });
              }
            }
          }"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced allMatch logic!")
else:
    print("Not found allMatch logic!")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
