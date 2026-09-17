const allocStaff = [
  { id: '1', assignment_id: 'ASST-1', staff_role: 'Photographer', slot_number: 1, staff_name: '' },
  { id: '2', assignment_id: 'ASST-2', staff_role: 'Photographer ', slot_number: 2, staff_name: '' }
];

const task = { roleName: 'Photographer', targetQty: 2 };
const slotsToRender = [];

const isRoleMatch = (a, b) => a.trim() === b.trim();

const taskSlots = allocStaff.filter((s) => s.staff_role === task.roleName || isRoleMatch(s.staff_role, task.roleName));

for (let sNum = 1; sNum <= task.targetQty; sNum++) {
  let matchedSlot = taskSlots.find((s) => Number(s.slot_number || 1) === sNum);
  
  if (matchedSlot) {
    slotsToRender.push({
      ...matchedSlot,
      staff_role: task.roleName,
      slot_number: sNum
    });
  }
}
console.log('Initial slotsToRender:', slotsToRender);

// Simulate onChange for Slot 1
const slot = slotsToRender[0];
const selectedName = 'Akash';
const existingAlloc = { staff: allocStaff };

let found = false;
const updatedStaff = existingAlloc.staff.map(s => {
  const isTarget = (
    (s.assignment_id && slot.assignment_id && s.assignment_id === slot.assignment_id) ||
    (s.id && slot.id && s.id === slot.id) ||
    (s.task_id && slot.task_id && s.task_id === slot.task_id) ||
    (s.staff_role === slot.staff_role && Number(s.slot_number || 1) === Number(slot.slot_number || 1))
  );
  if (isTarget) {
    found = true;
    return { ...s, ...slot, staff_name: selectedName };
  }
  return s;
});

console.log('Updated staff:', updatedStaff);
