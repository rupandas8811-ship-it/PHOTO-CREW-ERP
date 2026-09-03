const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target1 = `        if (dbStaffAssignments) {
          const enriched = dbStaffAssignments.map((sa: any) => {
            const op = dbOperations?.find((o: any) => o.order_id === sa.order_id);
            if (op) {
               return { ...sa, target_stage: op.current_stage || '' };
            }
            return sa;
          });
          setStaffAssignments(enriched);
        }`;

const replacement1 = `        if (dbStaffAssignments) {
          const enriched = dbStaffAssignments.map((sa: any) => {
            let staffName = sa.staff_name || '';
            if (staffName.includes('__SLOT__')) {
              staffName = staffName.split('__SLOT__')[0];
            }
            const op = dbOperations?.find((o: any) => o.order_id === sa.order_id);
            const enrichedSa = { ...sa, staff_name: staffName };
            if (op) {
               return { ...enrichedSa, target_stage: op.current_stage || '' };
            }
            return enrichedSa;
          });
          setStaffAssignments(enriched);
        }`;

if(code.indexOf(target1) !== -1) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched target1");
} else {
  console.log("Target 1 not found");
}
