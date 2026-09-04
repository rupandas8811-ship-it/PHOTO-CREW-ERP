const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

code = code.replace(
  `                                        onClick={() => setSelectedEventImages({ 
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
  `                                        onClick={() => openEventImages(member, ord, memberEvId, assetCollection, evStart, evEnd, eqHandover)}`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
