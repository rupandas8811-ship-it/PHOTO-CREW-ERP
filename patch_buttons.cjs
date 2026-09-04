const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `                                          onClick={() => setSelectedEquipmentStatus({ 
                                            staffName: member.staff_name, 
                                            assignedEquipment: effectiveAssignedEq.length > 0 ? effectiveAssignedEq : (member.assigned_equipment || []),
                                            orderId: ord.order_id,
                                            eventId: memberEvId,
                                            assignmentId: member.assignment_id,
                                            eventName: member.event_name,
                                            eqReceived: assetCollection, 
                                            eqHandover 
                                          })}`,
  `                                          onClick={() => {
                                            const eqToPass = effectiveAssignedEq.length > 0 ? effectiveAssignedEq : (member.assigned_equipment || []);
                                            member.effectiveAssignedEq = eqToPass;
                                            openEquipmentVerification(member, ord, memberEvId, assetCollection, eqHandover);
                                          }}`
);

code = code.replace(
  `                                          onClick={() => setSelectedEventImages({ 
                                            staffName: member.staff_name, 
                                            orderId: ord.order_id,
                                            eventId: memberEvId,
                                            assignmentId: member.assignment_id,
                                            eventName: member.event_name,
                                            assetCollection, 
                                            evStart, 
                                            evEnd, 
                                            eqHandover 
                                          })}`,
  `                                          onClick={() => openEventImages(member, ord, memberEvId, assetCollection, evStart, evEnd, eqHandover)}`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
