const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');

const target1 = `                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        return { ...s, staff_type: newType, staff_name: '', staff_id: '', mobile: '' };
                                                      }
                                                      return s;
                                                    });
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });`;

const replacement1 = `                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    let found = false;
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        found = true;
                                                        return { ...s, staff_type: newType, staff_name: '', staff_id: '', mobile: '' };
                                                      }
                                                      return s;
                                                    });
                                                    if (!found) {
                                                      updatedStaff.push({ ...slot, staff_type: newType, staff_name: '', staff_id: '', mobile: '' });
                                                    }
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });`;

const target2 = `                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        return {
                                                          ...s,
                                                          staff_name: selectedName,
                                                          staff_id: staffId,
                                                          mobile: memberInfo?.mobile || ''
                                                        };
                                                      }
                                                      return s;
                                                    });
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });`;

const replacement2 = `                                                  setEventAllocations((prev: any) => {
                                                    const existingAlloc = prev[evId] || { staff: [] };
                                                    let found = false;
                                                    const updatedStaff = existingAlloc.staff.map((s: any) => {
                                                      if (s.id === slot.id || s === slot) {
                                                        found = true;
                                                        return {
                                                          ...s,
                                                          staff_name: selectedName,
                                                          staff_id: staffId,
                                                          mobile: memberInfo?.mobile || ''
                                                        };
                                                      }
                                                      return s;
                                                    });
                                                    if (!found) {
                                                      updatedStaff.push({
                                                        ...slot,
                                                        staff_name: selectedName,
                                                        staff_id: staffId,
                                                        mobile: memberInfo?.mobile || ''
                                                      });
                                                    }
                                                    return { ...prev, [evId]: { ...existingAlloc, staff: updatedStaff } };
                                                  });`;

let patched = false;
if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("Patched target 1");
  patched = true;
} else {
  console.log("Target 1 not found");
}

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  console.log("Patched target 2");
  patched = true;
} else {
  console.log("Target 2 not found");
}

if (patched) {
  fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
}
