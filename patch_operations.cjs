const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

// For getRecordForStage
code = code.replace(
  `                                    const hAssignmentId = h.assignment_id || parsed.assignment_id;
                                    if (member.assignment_id && hAssignmentId && member.assignment_id !== hAssignmentId) {
                                      return false;
                                    }`,
  `                                    const hAssignmentId = h.assignment_id || parsed.assignment_id;
                                    if (member.assignment_id) {
                                      if (hAssignmentId && member.assignment_id !== hAssignmentId) return false;
                                      if (!hAssignmentId) {
                                        // If no hAssignmentId, at least strictly match the event ID
                                        const hEventId = parsed.event_id || h.event_id;
                                        if (memberEvId && memberEvId !== 'gen' && hEventId && hEventId !== 'gen' && hEventId !== memberEvId) return false;
                                      }
                                    }`
);

// For raw footage lookup (1) around line 5317
code = code.replace(
  `                                  const rfMatch = rawFootage.find(rf => {
                                    if (rf.order_id !== ord.order_id) return false;
                                    const upBy = (rf.uploaded_by || '').trim().toLowerCase();
                                    if (upBy && upBy !== normStaffName) return false;
                                    if (memberEvId && rf.event_id) {
                                      if (rf.event_id !== memberEvId) return false;
                                    } else if (rf.event_name) {
                                      if (rf.event_name.trim().toLowerCase() !== normEvName) return false;
                                    }
                                    return true;
                                  });`,
  `                                  const rfMatch = rawFootage.find(rf => {
                                    if (rf.order_id !== ord.order_id) return false;
                                    if (member.assignment_id && rf.assignment_id && member.assignment_id !== rf.assignment_id) return false;
                                    const upBy = (rf.uploaded_by || '').trim().toLowerCase();
                                    if (upBy && upBy !== normStaffName) return false;
                                    if (memberEvId && rf.event_id) {
                                      if (rf.event_id !== memberEvId) return false;
                                    } else if (rf.event_name) {
                                      if (rf.event_name.trim().toLowerCase() !== normEvName) return false;
                                    }
                                    return true;
                                  });`
);

// For raw footage lookup (3) around line 5350
code = code.replace(
  `                                  const hMatch = leadEquipmentHistory.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    let parsed: any = {};
                                    if (h.remarks) {
                                      try { parsed = JSON.parse(h.remarks); } catch(e) {}
                                    }
                                    if (member.assignment_id && parsed.assignment_id && parsed.assignment_id !== member.assignment_id) return false;
                                    if (memberEvId && parsed.event_id && parsed.event_id !== memberEvId) return false;`,
  `                                  const hMatch = leadEquipmentHistory.find(h => {
                                    if (h.order_id !== ord.order_id) return false;
                                    let parsed: any = {};
                                    if (h.remarks) {
                                      try { parsed = JSON.parse(h.remarks); } catch(e) {}
                                    }
                                    const hAssignmentId = parsed.assignment_id || h.assignment_id;
                                    if (member.assignment_id && hAssignmentId && hAssignmentId !== member.assignment_id) return false;
                                    if (member.assignment_id && !hAssignmentId && memberEvId && parsed.event_id && parsed.event_id !== memberEvId) return false;
                                    if (!member.assignment_id && memberEvId && parsed.event_id && parsed.event_id !== memberEvId) return false;`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
