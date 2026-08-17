const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const target = `                              // Create matching staff_assignment for the Production Staff dashboard
                              newStaffAssignments.push({
                                assignment_id: id,
                                order_id: orderId,
                                staff_role: st.role || 'Editor',
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                assignment_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                assignment_status: finalStatus || 'Assigned',
                                task_status: 'Pending',
                                event_id: section.eventId,
                                event_name: section.eventName || '',
                                updated_by: currentUserName || 'System'
                              });`;

const replacement = `                              // Create matching staff_assignment for the Production Staff dashboard
                              newStaffAssignments.push({
                                assignment_id: id,
                                order_id: orderId,
                                staff_role: st.role || 'Editor',
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                assignment_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                assignment_status: finalStatus || 'Assigned'
                              });`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ProductionModule.tsx', code);
