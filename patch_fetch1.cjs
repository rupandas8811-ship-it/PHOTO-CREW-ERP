const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target = `          const enriched = dbStaffAssignments.map((sa: any) => {
            const cached = cachedAssignments.find((c: any) => 
              (c.assignment_id && c.assignment_id === sa.assignment_id) ||
              (c.order_id === sa.order_id && (c.staff_id === sa.staff_id || (c.staff_name && sa.staff_name && c.staff_name.toLowerCase() === sa.staff_name.toLowerCase())))
            );
            if (cached) {
              return {
                ...sa,
                event_id: cached.event_id || sa.event_id || '',
                event_name: cached.event_name || sa.event_name || '',
                equipment: cached.equipment || sa.equipment || [],
                mobile: cached.mobile || sa.mobile || '',
                staff_type: cached.staff_type || sa.staff_type || 'In-House'
              };
            }
            return sa;
          });`;

const replacement = `          const enriched = dbStaffAssignments.map((sa: any) => {
            let staffName = sa.staff_name || '';
            if (staffName.includes('__SLOT__')) {
              staffName = staffName.split('__SLOT__')[0];
            }
            const cleanSa = { ...sa, staff_name: staffName };
            const cached = cachedAssignments.find((c: any) => 
              (c.assignment_id && c.assignment_id === cleanSa.assignment_id) ||
              (c.order_id === cleanSa.order_id && (c.staff_id === cleanSa.staff_id || (c.staff_name && cleanSa.staff_name && c.staff_name.toLowerCase() === cleanSa.staff_name.toLowerCase())))
            );
            if (cached) {
              return {
                ...cleanSa,
                event_id: cached.event_id || cleanSa.event_id || '',
                event_name: cached.event_name || cleanSa.event_name || '',
                equipment: cached.equipment || cleanSa.equipment || [],
                mobile: cached.mobile || cleanSa.mobile || '',
                staff_type: cached.staff_type || cleanSa.staff_type || 'In-House'
              };
            }
            return cleanSa;
          });`;

if(code.indexOf(target) !== -1) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched 1");
} else {
  console.log("Target not found");
}
