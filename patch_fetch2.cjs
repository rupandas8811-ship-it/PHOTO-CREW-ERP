const fs = require('fs');
let code = fs.readFileSync('src/components/RoleContext.tsx', 'utf-8');

const target2 = `      } else {
        // Sync local React state and cache with freshly fetched verified records from DB
        setStaffAssignments(prev => {
          const otherOrders = prev.filter(sa => sa.order_id !== orderId);
          const combined = [...otherOrders, ...verified];
          try {
            localStorage.setItem('erp_staff_assignments', JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }`;

const replacement2 = `      } else {
        // Sync local React state and cache with freshly fetched verified records from DB
        setStaffAssignments(prev => {
          const otherOrders = prev.filter(sa => sa.order_id !== orderId);
          const cleanVerified = verified.map((v: any) => {
            let staffName = v.staff_name || '';
            if (staffName.includes('__SLOT__')) {
              staffName = staffName.split('__SLOT__')[0];
            }
            return { ...v, staff_name: staffName };
          });
          const combined = [...otherOrders, ...cleanVerified];
          try {
            localStorage.setItem('erp_staff_assignments', JSON.stringify(combined));
          } catch (e) {}
          return combined;
        });
      }`;

if(code.indexOf(target2) !== -1) {
  code = code.replace(target2, replacement2);
  fs.writeFileSync('src/components/RoleContext.tsx', code);
  console.log("Patched target2");
} else {
  console.log("Target 2 not found");
}
