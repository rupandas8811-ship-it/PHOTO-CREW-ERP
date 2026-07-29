const fs = require('fs');
const content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

const target = `                                    if (!h.remarks) return false;
                                    try {
                                      const parsed = JSON.parse(h.remarks);
                                      if (parsed.event_name && parsed.event_name !== evName && evName !== 'Main Event' && parsed.event_name !== 'Main Event') return false;
                                      return true;
                                    } catch (e) { return true; }`;

const replace = `                                    if (h.event_name && h.event_name !== evName && evName !== 'Main Event' && h.event_name !== 'Main Event') return false;
                                    
                                    if (!h.event_name && h.remarks) {
                                      try {
                                        const parsed = JSON.parse(h.remarks);
                                        if (parsed.event_name && parsed.event_name !== evName && evName !== 'Main Event' && parsed.event_name !== 'Main Event') return false;
                                      } catch (e) { }
                                    }
                                    return true;`;

let updated = content.replace(target, replace);

const urlTarget = `                                const getPhotoUrl = (record: any) => {
                                  if (!record || !record.remarks) return null;
                                  try {
                                    return JSON.parse(record.remarks).photo_url;
                                  } catch (e) { return null; }
                                };`;

const urlReplace = `                                const getPhotoUrl = (record: any) => {
                                  if (!record) return null;
                                  if (record.photo_url) return record.photo_url;
                                  if (!record.remarks) return null;
                                  try {
                                    return JSON.parse(record.remarks).photo_url;
                                  } catch (e) { return null; }
                                };`;

updated = updated.replace(urlTarget, urlReplace);

// and inside the modals
const modalTarget1 = `const url = JSON.parse(selectedEquipmentStatus.eqReceived.remarks).photo_url;`;
const modalReplace1 = `const url = selectedEquipmentStatus.eqReceived.photo_url || JSON.parse(selectedEquipmentStatus.eqReceived.remarks).photo_url;`;

const modalTarget2 = `const url = JSON.parse(selectedEquipmentStatus.eqHandover.remarks).photo_url;`;
const modalReplace2 = `const url = selectedEquipmentStatus.eqHandover.photo_url || JSON.parse(selectedEquipmentStatus.eqHandover.remarks).photo_url;`;

updated = updated.replace(modalTarget1, modalReplace1);
updated = updated.replace(modalTarget2, modalReplace2);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', updated);
console.log("Patched ops reads");
