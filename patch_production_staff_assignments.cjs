const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const target = `                        // 1. Delete all existing editor assignments for this production
                        const { error: deleteError } = await supabaseClient
                          .from('editor_assignments')
                          .delete()
                          .eq('production_id', activeWorkflowProd.production_id);
                        
                        if (deleteError) throw deleteError;`;

const replacement = `                        // 1. Delete all existing editor assignments for this production
                        const { error: deleteError } = await supabaseClient
                          .from('editor_assignments')
                          .delete()
                          .eq('production_id', activeWorkflowProd.production_id);
                        
                        if (deleteError) throw deleteError;
                        
                        // Delete the synced staff_assignments as well
                        const oldEditorAssignmentIds = assignedForOrder.map(a => a.assignment_id).filter(Boolean);
                        if (oldEditorAssignmentIds.length > 0) {
                          await supabaseClient
                            .from('staff_assignments')
                            .delete()
                            .in('assignment_id', oldEditorAssignmentIds);
                        }`;

code = code.replace(target, replacement);

const targetLoopEnd = `                              newAssignments.push({
                                ...preservedFields,
                                assignment_id: id,
                                production_id: activeWorkflowProd.production_id,
                                order_id: orderId,
                                event_id: section.eventId,
                                deliverable_id: item.text,
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                speciality: item.text,
                                assigned_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                target_finish_date: wfTargetDeliveryDate,
                                status: finalStatus,
                                created_at: originalAssignment?.created_at || new Date().toISOString()
                              });
                            }
                          }
                        }`;

const replacementLoopEnd = `                              newAssignments.push({
                                ...preservedFields,
                                assignment_id: id,
                                production_id: activeWorkflowProd.production_id,
                                order_id: orderId,
                                event_id: section.eventId,
                                deliverable_id: item.text,
                                staff_id: st.staff_id,
                                staff_name: item.editor,
                                speciality: item.text,
                                assigned_date: originalAssignment?.assigned_date || new Date().toISOString().split('T')[0],
                                target_finish_date: wfTargetDeliveryDate,
                                status: finalStatus,
                                created_at: originalAssignment?.created_at || new Date().toISOString()
                              });
                              
                              // Create matching staff_assignment for the Production Staff dashboard
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
                              });
                            }
                          }
                        }`;

code = code.replace(targetLoopEnd, replacementLoopEnd);

const targetInit = `// 2. Prepare new assignments across all sections
                        const newAssignments = [];
                        for (const section of wfEventSections) {`;

const replacementInit = `// 2. Prepare new assignments across all sections
                        const newAssignments = [];
                        const newStaffAssignments = [];
                        for (const section of wfEventSections) {`;

code = code.replace(targetInit, replacementInit);

const targetInsert = `                        if (newAssignments.length > 0) {
                          const { error: insertError } = await supabaseClient
                            .from('editor_assignments')
                            .insert(newAssignments);
                          if (insertError) throw insertError;
                        }`;

const replacementInsert = `                        if (newAssignments.length > 0) {
                          const { error: insertError } = await supabaseClient
                            .from('editor_assignments')
                            .insert(newAssignments);
                          if (insertError) throw insertError;
                        }
                        
                        if (newStaffAssignments && newStaffAssignments.length > 0) {
                          const { error: staffInsertError } = await supabaseClient
                            .from('staff_assignments')
                            .insert(newStaffAssignments);
                          if (staffInsertError) {
                            console.warn("Failed to sync staff_assignments:", staffInsertError);
                          }
                        }`;

code = code.replace(targetInsert, replacementInsert);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
