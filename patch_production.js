const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Insert isAssignmentActive helper after isProjectLocked
const isProjectLockedDef = `const isProjectLocked = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return ['project completed', 'completed', 'delivered', 'project delivered', 'project cancelled', 'cancelled', 'canceled', 'closed', 'project closed', 'order closed'].includes(s);
};`;

const isAssignmentActiveDef = `

const isAssignmentActive = (a: any, productionList: any[] = []): boolean => {
  if (!a) return false;
  const s = (a.status || '').toLowerCase();
  if (['completed', 'editing completed', 'project closed', 'order closed', 'closed', 'cancelled', 'canceled'].includes(s)) return false;
  
  if (productionList.length > 0) {
    const prod = productionList.find(p => p.production_id === a.production_id);
    if (prod && isProjectLocked(prod.editing_status)) {
      return false;
    }
  }
  return true;
};
`;

code = code.replace(isProjectLockedDef, isProjectLockedDef + isAssignmentActiveDef);

// Replace editorAssignments.some(a => a.staff_id === currentStaff.staff_id && a.status !== 'Completed')
code = code.replace(
  /a\.status !== 'Completed'/g,
  'isAssignmentActive(a, production)'
);

// We need to be careful, wait, is `production` available in all these scopes?
// Let's use `production || []` just in case.
code = code.replace(
  /isAssignmentActive\(a, production\)/g,
  'isAssignmentActive(a, production || [])'
);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
console.log('Patched ProductionModule.tsx');
