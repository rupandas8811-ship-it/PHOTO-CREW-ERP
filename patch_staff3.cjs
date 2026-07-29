const fs = require('fs');
const content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

// target for buttons:
const buttonsTarget = `                            {!isStarted && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Start')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                              >
                                <Play className="w-3.5 h-3.5" /> Event Start
                              </button>
                            )}

                            {isStarted && !isCompleted && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Complete')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Event Complete
                              </button>
                            )}`;

const buttonsReplace = `                            {!hasEquipmentReceived && (
                              <button
                                onClick={() => openPhotoModal(b, 'Equipment Received')}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Equipment Received
                              </button>
                            )}
                            {hasEquipmentReceived && !hasEventStart && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Start')}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
                              >
                                <Play className="w-3.5 h-3.5" /> Event Start
                              </button>
                            )}
                            {hasEventStart && !hasEquipmentHandover && (
                              <button
                                onClick={() => openPhotoModal(b, 'Equipment Handover')}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Equipment Handover
                              </button>
                            )}
                            {hasEquipmentHandover && !isCompleted && (
                              <button
                                onClick={() => openPhotoModal(b, 'Event Complete')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Event Complete
                              </button>
                            )}`;

// Target for the variables:
const varsTarget = `                    const proofData = staffProofs[b.key] || {};
                    const isStarted = b.taskStatus === 'Event Started' || b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Start' || b.taskStatus === 'Event Complete';
                    const isCompleted = b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Complete';`;

const varsReplace = `                    const proofData = staffProofs[b.key] || {};
                    const isStarted = b.taskStatus === 'Event Started' || b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Start' || b.taskStatus === 'Event Complete';
                    const isCompleted = b.taskStatus === 'Event Completed' || b.taskStatus === 'Event Complete';
                    
                    const hasEquipmentReceived = proofData.equipmentReceivedProofs && proofData.equipmentReceivedProofs.length > 0;
                    const hasEventStart = proofData.eventStartProofs && proofData.eventStartProofs.length > 0;
                    const hasEquipmentHandover = proofData.equipmentHandoverProofs && proofData.equipmentHandoverProofs.length > 0;`;

let updatedContent = content.replace(buttonsTarget, buttonsReplace);
updatedContent = updatedContent.replace(varsTarget, varsReplace);
fs.writeFileSync('src/components/StaffModule.tsx', updatedContent);
console.log("Patched buttons");
