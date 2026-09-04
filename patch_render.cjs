const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

// For Equipment Verification Modal
const oldBlock1 = `                  {(() => {
                    const findHistoryForModal = (stages: string[]) => {
                      const staffNorm = (selectedEquipmentStatus.staffName || '').trim().toLowerCase();
                      const orderId = selectedEquipmentStatus.orderId;
                      const eventId = selectedEquipmentStatus.eventId;
                      const assignmentId = selectedEquipmentStatus.assignmentId;
                      
                      if (!leadEquipmentHistory || leadEquipmentHistory.length === 0) return null;
                      const matches = leadEquipmentHistory.filter(h => {
                        if (orderId && h.order_id && h.order_id !== orderId) return false;
                        let parsed: any = {};
                        if (h.remarks) {
                          try { parsed = JSON.parse(h.remarks); } catch(e) {}
                        }
                        const retBy = (h.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
                        if (retBy && staffNorm && retBy !== staffNorm && !staffNorm.includes(retBy) && !retBy.includes(staffNorm)) return false;
                        
                        const hEventId = parsed.event_id || h.event_id;
                        const hAssignmentId = parsed.assignment_id || h.assignment_id;
                        
                        if (assignmentId) {
                          if (hAssignmentId !== assignmentId) return false;
                        } else if (eventId && eventId !== "gen" && eventId !== "ev") {
                          if (hEventId && hEventId !== "gen" && hEventId !== "ev" && hEventId !== eventId) return false;
                        }
                        
                        const eqStatus = (h.equipment_status || parsed.proof_type || '').toLowerCase();
                        const eqName = (h.equipment_name || '').toLowerCase();
                        return stages.some(s => {
                          const sNorm = s.toLowerCase();
                          return eqStatus.includes(sNorm) || eqName.includes(sNorm);
                        });
                      });
                      
                      const withPhoto = matches.find(m => {
                        const meta = getRecordMeta(m);
                        return !!meta.url;
                      });
                      return withPhoto || matches[0] || null;
                    };

                    const recRecord = selectedEquipmentStatus.eqReceived || findHistoryForModal(['Equipment Received', 'Asset Collection', 'Received']);
                    const handRecord = selectedEquipmentStatus.eqHandover || findHistoryForModal(['Equipment Handover', 'Returned', 'Handover', 'Asset Return']);
                    const recMeta = getRecordMeta(recRecord);
                    const handMeta = getRecordMeta(handRecord);
                    return (`;

const newBlock1 = `                  {(() => {
                    let recUrl = getRecordMeta(selectedEquipmentStatus.eqReceived).url;
                    let handUrl = getRecordMeta(selectedEquipmentStatus.eqHandover).url;
                    let recTime = getRecordMeta(selectedEquipmentStatus.eqReceived).date;
                    let handTime = getRecordMeta(selectedEquipmentStatus.eqHandover).date;

                    if (selectedEquipmentStatus.taskDetails) {
                       recUrl = selectedEquipmentStatus.taskDetails.equipment_received_photo || recUrl;
                       handUrl = selectedEquipmentStatus.taskDetails.equipment_handover_photo || handUrl;
                    }

                    return (`;

code = code.replace(oldBlock1, newBlock1);
code = code.replace(
  `                            {recMeta.url ? (`,
  `                            {recUrl ? (`
);
code = code.replace(
  `                              <SafeProofImage url={recMeta.url} alt="Received" />`,
  `                              <SafeProofImage url={recUrl} alt="Received" />`
);
code = code.replace(
  `                            {recMeta.date ? formatDateDDMMYY(recMeta.date) : '-'}`,
  `                            {recTime ? formatDateDDMMYY(recTime) : '-'}`
);
code = code.replace(
  `                            {recMeta.date ? convertTo12Hour(recMeta.date.split('T')[1]?.split('.')[0] || '') : '-'}`,
  `                            {recTime ? convertTo12Hour(recTime.split('T')[1]?.split('.')[0] || '') : '-'}`
);

code = code.replace(
  `                            {handMeta.url ? (`,
  `                            {handUrl ? (`
);
code = code.replace(
  `                              <SafeProofImage url={handMeta.url} alt="Handover" />`,
  `                              <SafeProofImage url={handUrl} alt="Handover" />`
);
code = code.replace(
  `                            {handMeta.date ? formatDateDDMMYY(handMeta.date) : '-'}`,
  `                            {handTime ? formatDateDDMMYY(handTime) : '-'}`
);
code = code.replace(
  `                            {handMeta.date ? convertTo12Hour(handMeta.date.split('T')[1]?.split('.')[0] || '') : '-'}`,
  `                            {handTime ? convertTo12Hour(handTime.split('T')[1]?.split('.')[0] || '') : '-'}`
);


// For Event Images Modal
const oldBlock2 = `                  {(() => {
                    const findHistoryForModal = (stages: string[]) => {
                      const staffNorm = (selectedEventImages.staffName || '').trim().toLowerCase();
                      const orderId = selectedEventImages.orderId;
                      const eventId = selectedEventImages.eventId;
                      const assignmentId = selectedEventImages.assignmentId;
                      
                      if (!leadEquipmentHistory || leadEquipmentHistory.length === 0) return null;
                      const matches = leadEquipmentHistory.filter(h => {
                        if (orderId && h.order_id && h.order_id !== orderId) return false;
                        let parsed: any = {};
                        if (h.remarks) {
                          try { parsed = JSON.parse(h.remarks); } catch(e) {}
                        }
                        const retBy = (h.returned_by || parsed.staff_name || parsed.uploaded_by || '').trim().toLowerCase();
                        if (retBy && staffNorm && retBy !== staffNorm && !staffNorm.includes(retBy) && !retBy.includes(staffNorm)) return false;
                        
                        const hEventId = parsed.event_id || h.event_id;
                        const hAssignmentId = parsed.assignment_id || h.assignment_id;
                        
                        if (assignmentId) {
                          if (hAssignmentId !== assignmentId) return false;
                        } else if (eventId && eventId !== "gen" && eventId !== "ev") {
                          if (hEventId && hEventId !== "gen" && hEventId !== "ev" && hEventId !== eventId) return false;
                        }
                        
                        const eqStatus = (h.equipment_status || parsed.proof_type || '').toLowerCase();
                        const eqName = (h.equipment_name || '').toLowerCase();
                        return stages.some(s => {
                          const sNorm = s.toLowerCase();
                          return eqStatus.includes(sNorm) || eqName.includes(sNorm);
                        });
                      });
                      
                      const withPhoto = matches.find(m => {
                        const meta = getRecordMeta(m);
                        return !!meta.url;
                      });
                      return withPhoto || matches[0] || null;
                    };

                    const evStartRecord = selectedEventImages.evStart || findHistoryForModal(['Event Start Photo Proof', 'Event Start', 'Event Started']);
                    const evEndRecord = selectedEventImages.evEnd || findHistoryForModal(['Event Completion Photo Proof', 'Event Completion', 'Event Complete', 'Event Ended']);
                    const evStartMeta = getRecordMeta(evStartRecord);
                    const evEndMeta = getRecordMeta(evEndRecord);

                    return (`;

const newBlock2 = `                  {(() => {
                    let startUrl = getRecordMeta(selectedEventImages.evStart).url;
                    let endUrl = getRecordMeta(selectedEventImages.evEnd).url;
                    let startTime = getRecordMeta(selectedEventImages.evStart).date;
                    let endTime = getRecordMeta(selectedEventImages.evEnd).date;

                    if (selectedEventImages.taskDetails) {
                       startUrl = selectedEventImages.taskDetails.event_start_photo || startUrl;
                       endUrl = selectedEventImages.taskDetails.event_end_photo || endUrl;
                    }

                    return (`;

code = code.replace(oldBlock2, newBlock2);
code = code.replace(
  `                            {evStartMeta.url ? (`,
  `                            {startUrl ? (`
);
code = code.replace(
  `                              <SafeProofImage url={evStartMeta.url} alt="Event Start" />`,
  `                              <SafeProofImage url={startUrl} alt="Event Start" />`
);
code = code.replace(
  `                            {evStartMeta.date ? formatDateDDMMYY(evStartMeta.date) : '-'}`,
  `                            {startTime ? formatDateDDMMYY(startTime) : '-'}`
);
code = code.replace(
  `                            {evStartMeta.date ? convertTo12Hour(evStartMeta.date.split('T')[1]?.split('.')[0] || '') : '-'}`,
  `                            {startTime ? convertTo12Hour(startTime.split('T')[1]?.split('.')[0] || '') : '-'}`
);

code = code.replace(
  `                            {evEndMeta.url ? (`,
  `                            {endUrl ? (`
);
code = code.replace(
  `                              <SafeProofImage url={evEndMeta.url} alt="Event End" />`,
  `                              <SafeProofImage url={endUrl} alt="Event End" />`
);
code = code.replace(
  `                            {evEndMeta.date ? formatDateDDMMYY(evEndMeta.date) : '-'}`,
  `                            {endTime ? formatDateDDMMYY(endTime) : '-'}`
);
code = code.replace(
  `                            {evEndMeta.date ? convertTo12Hour(evEndMeta.date.split('T')[1]?.split('.')[0] || '') : '-'}`,
  `                            {endTime ? convertTo12Hour(endTime.split('T')[1]?.split('.')[0] || '') : '-'}`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
