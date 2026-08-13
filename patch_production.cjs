const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const isProjectLockedDef = `const isProjectLocked = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return ['project completed', 'completed', 'delivered', 'project delivered', 'project cancelled', 'cancelled', 'canceled', 'closed', 'project closed', 'order closed'].includes(s);
};`;

const isAssignmentActiveDef = `

export const isAssignmentActive = (a: any, productionList: any[] = []): boolean => {
  if (!a) return false;
  const s = (a.status || '').toLowerCase();
  if (['completed', 'editing completed', 'project closed', 'order closed', 'closed', 'cancelled', 'canceled'].includes(s)) return false;
  
  if (productionList.length > 0 && a.production_id) {
    const prod = productionList.find(p => p.production_id === a.production_id);
    if (prod && isProjectLocked(prod.editing_status)) {
      return false;
    }
  }
  return true;
};
`;

code = code.replace(isProjectLockedDef, isProjectLockedDef + isAssignmentActiveDef);

code = code.replace(/a\.status !== 'Completed'/g, 'isAssignmentActive(a, production || [])');

fs.writeFileSync('src/components/ProductionModule.tsx', code);
console.log('Patched ProductionModule.tsx');
