const fs = require('fs');
const content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

// We need to inject the check in the select onChange handler
const selectTarget = `                              } else if (newStatus === 'Raw Footage Received') {
                                setReceivingFootageOrderId(ord.order_id);`;

const selectReplace = `                              } else if (newStatus === 'Raw Footage Received') {
                                const staffAssignmentsForOrder = staffAssignments?.filter(sa => sa.order_id === ord.order_id && sa.assignment_status !== 'Cancelled') || [];
                                const allCompleted = staffAssignmentsForOrder.length > 0 && staffAssignmentsForOrder.every(sa => sa.assignment_status === 'Event Completed' || (sa as any).task_status === 'Event Completed');
                                if (!allCompleted) {
                                  alert('Operation staff have not completed the event yet.');
                                  e.target.value = '';
                                  return;
                                }
                                setReceivingFootageOrderId(ord.order_id);`;

let updatedContent = content.replace(selectTarget, selectReplace);

const updateRawTarget = `                            actionItems.push({
                              label: 'Update Raw Footage',
                              onClick: () => {
                                setReceivingFootageOrderId(ord.order_id);`;

const updateRawReplace = `                            actionItems.push({
                              label: 'Update Raw Footage',
                              onClick: () => {
                                const staffAssignmentsForOrder = staffAssignments?.filter(sa => sa.order_id === ord.order_id && sa.assignment_status !== 'Cancelled') || [];
                                const allCompleted = staffAssignmentsForOrder.length > 0 && staffAssignmentsForOrder.every(sa => sa.assignment_status === 'Event Completed' || (sa as any).task_status === 'Event Completed');
                                if (!allCompleted) {
                                  alert('Operation staff have not completed the event yet.');
                                  return;
                                }
                                setReceivingFootageOrderId(ord.order_id);`;

updatedContent = updatedContent.replace(updateRawTarget, updateRawReplace);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', updatedContent);
console.log("Patched Raw Footage lock");
