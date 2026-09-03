const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const target1 = `                                                 onToggleEquipment={(eqName) => {
                                                   setEventAllocations((prev: any) => {
                                                     const existingAlloc = prev[evId] || { staff: [] };
                                                     const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                       if (s.id === slot.id || s === slot) {
                                                         const currentEq = s.equipment || [];
                                                         const isSelected = currentEq.includes(eqName);
                                                         return {
                                                           ...s,
                                                           equipment: isSelected
                                                             ? currentEq.filter((name: string) => name !== eqName)
                                                             : [...currentEq, eqName]
                                                         };
                                                       }
                                                       return s;
                                                     });
                                                     return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                   });
                                                 }}`;

const replacement1 = `                                                 onToggleEquipment={(eqName) => {
                                                   setEventAllocations((prev: any) => {
                                                     const existingAlloc = prev[evId] || { staff: [] };
                                                     let found = false;
                                                     const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                       if (s.id === slot.id || s === slot) {
                                                         found = true;
                                                         const currentEq = s.equipment || [];
                                                         const isSelected = currentEq.includes(eqName);
                                                         return {
                                                           ...s,
                                                           equipment: isSelected
                                                             ? currentEq.filter((name: string) => name !== eqName)
                                                             : [...currentEq, eqName]
                                                         };
                                                       }
                                                       return s;
                                                     });
                                                     if (!found) {
                                                       updatedStaff.push({
                                                         ...slot,
                                                         equipment: [eqName]
                                                       });
                                                     }
                                                     return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                   });
                                                 }}`;

const target2 = `                                                 onRemoveEquipment={(eqName) => {
                                                   setEventAllocations((prev: any) => {
                                                     const existingAlloc = prev[evId] || { staff: [] };
                                                     const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                       if (s.id === slot.id || s === slot) {
                                                         return {
                                                           ...s,
                                                           equipment: (s.equipment || []).filter((name: string) => name !== eqName)
                                                         };
                                                       }
                                                       return s;
                                                     });
                                                     return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                   });
                                                 }}`;

const replacement2 = `                                                 onRemoveEquipment={(eqName) => {
                                                   setEventAllocations((prev: any) => {
                                                     const existingAlloc = prev[evId] || { staff: [] };
                                                     const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                       if (s.id === slot.id || s === slot) {
                                                         return {
                                                           ...s,
                                                           equipment: (s.equipment || []).filter((name: string) => name !== eqName)
                                                         };
                                                       }
                                                       return s;
                                                     });
                                                     return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                   });
                                                 }}`; // removal from empty slot doesn't matter much so no push needed, just keeping it same but fixing spacing if needed. Wait I will leave target2 alone if it's just removing.

let patched = false;
if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("Patched target 1");
  patched = true;
} else {
  console.log("Target 1 not found");
}

if (patched) {
  fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
}
