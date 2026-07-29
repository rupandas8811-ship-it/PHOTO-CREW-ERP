const fs = require('fs');
const content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

// Replace the photoModalData type
let updated = content.replace(
  `stage: 'Event Start' | 'Event Complete';`,
  `stage: 'Equipment Received' | 'Event Start' | 'Equipment Handover' | 'Event Complete';`
);

// We also need to fix parsing of leadEquipmentHistory
// Let's replace the whole block parsing leadEquipmentHistory
const parseBlockTarget = `    // 2. Restore equipment verification photo proofs from leadEquipmentHistory
    if (leadEquipmentHistory && leadEquipmentHistory.length > 0) {
      setStaffProofs(prev => {
        const restored = { ...prev };
        leadEquipmentHistory.forEach(leh => {
          if (
            leh.returned_by &&
            leh.returned_by.toLowerCase() === staffName.toLowerCase() &&
            (leh.equipment_status === 'Event Start' || leh.equipment_status === 'Event Complete')
          ) {
            const key = \`\${leh.order_id}_gen_\${staffName.toLowerCase()}\`;`;

const parseBlockReplace = `    // 2. Restore equipment verification photo proofs from leadEquipmentHistory
    if (leadEquipmentHistory && leadEquipmentHistory.length > 0) {
      setStaffProofs(prev => {
        const restored = { ...prev };
        leadEquipmentHistory.forEach(leh => {
          if (
            leh.returned_by &&
            leh.returned_by.toLowerCase() === staffName.toLowerCase()
          ) {
            let eventId = 'gen';
            let photoUrl = (leh as any).photo_url || '';
            let assetId = (leh as any).asset_id || '';
            
            if (leh.remarks) {
              try {
                const parsed = JSON.parse(leh.remarks);
                photoUrl = parsed.photo_url || photoUrl;
                assetId = parsed.asset_id || assetId;
                if (parsed.event_id) {
                  eventId = parsed.event_id;
                }
              } catch (e) {}
            }
            
            const key = \`\${leh.order_id}_\${eventId}_\${staffName.toLowerCase()}\`;

            if (photoUrl) {
              const stage = leh.equipment_status;
              const proofField = stage === 'Equipment Received' ? 'equipmentReceivedProofs' :
                                 stage === 'Event Start' ? 'eventStartProofs' :
                                 stage === 'Equipment Handover' ? 'equipmentHandoverProofs' :
                                 stage === 'Event Complete' ? 'completeProofs' : 'startProofs';
              
              const existing = restored[key] || {};
              const proofArr = existing[proofField] ? [...existing[proofField]!] : [];
              const proofItem: EquipmentProofItem = {
                equipmentName: leh.equipment_name,
                assetId: assetId || \`EQ-\${leh.equipment_name}\`,
                photoUrl: photoUrl,
                capturedAt: leh.returned_at || new Date().toISOString()
              };

              if (!proofArr.some(p => p.equipmentName === proofItem.equipmentName)) {
                proofArr.push(proofItem);
              }

              restored[key] = {
                ...existing,
                [proofField]: proofArr
              };
            }
          }
        });
        return restored;
      });
    }`;

updated = updated.replace(
  `// 2. Restore equipment verification photo proofs from leadEquipmentHistory`,
  `// 2. MARKER_TMP_HACK`
);
const restoreStartIndex = updated.indexOf(`// 2. MARKER_TMP_HACK`);
if (restoreStartIndex > -1) {
  const restoreEndIndex = updated.indexOf(`  }, [leadEquipmentHistory, staffAssignments, staffName]);`, restoreStartIndex);
  updated = updated.slice(0, restoreStartIndex) + parseBlockReplace + '\n' + updated.slice(restoreEndIndex);
}

fs.writeFileSync('src/components/StaffModule.tsx', updated);
console.log("Patched phase 1");
