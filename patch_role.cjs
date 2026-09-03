const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target = `      const assignId = a.assignment_id || \`ASST-\${orderId}-\${a.event_id || 'evt'}-\${aStaffNameTrimmed.replace(/[^a-z0-9]/gi, '').slice(0, 10)}-\${Math.floor(Math.random()*1000)}\`;

      const finalReactAssignment = {
        assignment_id: assignId,
        order_id: orderId,
        staff_role: a.staff_role,
        staff_id: a.staff_id || '',
        staff_name: a.staff_name,
        assignment_date: (a as any).assignment_date || assignDate,
        assignment_status: a.assignment_status || 'Assigned',
        task_status: a.task_status || 'Assigned',
        event_id: a.event_id || '',
        event_name: a.event_name || '',
        equipment: Array.isArray(a.equipment) ? a.equipment : [],
        mobile: a.mobile || '',
        staff_type: a.staff_type || 'In-House',
        updated_by: changedBy
      };

      finalReactAssignments.push(finalReactAssignment);

      const matched = existingDbAssignments.find(ed => ed.assignment_id === a.assignment_id);

      if (matched) {
        matchedDbAssignmentIds.add(matched.assignment_id);
        updatedAssignments.push({
          matchColumn: 'assignment_id',
          matchValue: matched.assignment_id,
          updates: {
            staff_role: a.staff_role,
            staff_id: a.staff_id || matched.staff_id,
            staff_name: a.staff_name,
            assignment_date: (a as any).assignment_date || matched.assignment_date || assignDate,
            assignment_status: a.assignment_status || matched.assignment_status || 'Assigned',
            task_status: a.task_status || matched.task_status || 'Assigned',
            event_id: a.event_id || matched.event_id,
            event_name: a.event_name || matched.event_name,
            equipment: Array.isArray(a.equipment) ? a.equipment : [],
            mobile: a.mobile || matched.mobile || '',
            staff_type: a.staff_type || matched.staff_type || 'In-House',
            updated_at: timestamp,
            updated_by: changedBy
          }
        });
      } else {
        newInsertsForDb.push({
          assignment_id: assignId,
          order_id: orderId,
          staff_role: a.staff_role,
          staff_id: a.staff_id,
          staff_name: a.staff_name,`;

const replacement = `      const assignId = a.assignment_id || \`ASST-\${orderId}-\${a.event_id || 'evt'}-\${aStaffNameTrimmed.replace(/[^a-z0-9]/gi, '').slice(0, 10)}-\${Math.floor(Math.random()*1000)}\`;

      const slotPart = assignId.split('-').pop() || Math.floor(Math.random()*1000).toString();
      const dbStaffName = \`\${a.staff_name}__SLOT__\${slotPart}\`;

      const finalReactAssignment = {
        assignment_id: assignId,
        order_id: orderId,
        staff_role: a.staff_role,
        staff_id: a.staff_id || '',
        staff_name: a.staff_name,
        assignment_date: (a as any).assignment_date || assignDate,
        assignment_status: a.assignment_status || 'Assigned',
        task_status: a.task_status || 'Assigned',
        event_id: a.event_id || '',
        event_name: a.event_name || '',
        equipment: Array.isArray(a.equipment) ? a.equipment : [],
        mobile: a.mobile || '',
        staff_type: a.staff_type || 'In-House',
        updated_by: changedBy
      };

      finalReactAssignments.push(finalReactAssignment);

      const matched = existingDbAssignments.find(ed => ed.assignment_id === a.assignment_id);

      if (matched) {
        matchedDbAssignmentIds.add(matched.assignment_id);
        updatedAssignments.push({
          matchColumn: 'assignment_id',
          matchValue: matched.assignment_id,
          updates: {
            staff_role: a.staff_role,
            staff_id: a.staff_id || matched.staff_id,
            staff_name: dbStaffName,
            assignment_date: (a as any).assignment_date || matched.assignment_date || assignDate,
            assignment_status: a.assignment_status || matched.assignment_status || 'Assigned',
            task_status: a.task_status || matched.task_status || 'Assigned',
            event_id: a.event_id || matched.event_id,
            event_name: a.event_name || matched.event_name,
            equipment: Array.isArray(a.equipment) ? a.equipment : [],
            mobile: a.mobile || matched.mobile || '',
            staff_type: a.staff_type || matched.staff_type || 'In-House',
            updated_at: timestamp,
            updated_by: changedBy
          }
        });
      } else {
        newInsertsForDb.push({
          assignment_id: assignId,
          order_id: orderId,
          staff_role: a.staff_role,
          staff_id: a.staff_id,
          staff_name: dbStaffName,`;

if(code.indexOf(target) !== -1) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched 1");
} else {
  console.log("Target not found");
}

