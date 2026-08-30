const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

const isProdStaff = `  const isProductionStaffAssignment = (a: any) => {
    if (!a) return false;
    const sName = (a.staff_name || a.name || '').trim();
    const sId = (a.staff_id || '').trim();
    const prodStaffRec = (productionStaff || []).find((s: any) => 
      (sId && s.staff_id === sId) ||
      (sName && s.name && s.name.toLowerCase() === sName.toLowerCase())
    );
    const dept = (prodStaffRec?.department || a.department || '').trim().toLowerCase();
    const role = (prodStaffRec?.role || prodStaffRec?.production_role_speciality || a.staff_role || a.speciality || '').trim().toLowerCase();
    const nonProdRoles = ['photographer', 'cinematographer', 'drone operator', 'dop', 'camera', 'camera operator', 'operation staff', 'operations executive', 'operation manager', 'venue manager', 'operations', 'sales', 'sales executive', 'sales staff', 'sales manager', 'accountant'];
    if (dept === 'operations' || dept === 'operation' || dept === 'sales' || dept === 'accounts' || dept === 'hr') return false;
    if (nonProdRoles.some(r => role.includes(r))) return false;
    if (prodStaffRec) return true;
    if (dept.includes('production') || dept.includes('editing') || dept.includes('post')) return true;
    const prodRoles = ['editor', 'editing', 'album', 'teaser', 'colorist', 'audio', 'sound', 'designer', 'quality', 'qa', 'promo', 'trailer', 'post production', 'production', 'retoucher'];
    if (prodRoles.some(r => role.includes(r))) return true;
    return true;
  };
`;

code = code.replace("const getRawFootageDriveLink", isProdStaff + "\n  const getRawFootageDriveLink");
fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
console.log('done');
