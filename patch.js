import fs from 'fs';
let content = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const helpers = `
export const isProjectLocked = (status: string | undefined | null) => {
  if (!status) return false;
  return ['Project Delivered', 'Completed', 'Client Review Sent'].includes(status);
};

export const isAssignmentActive = (assignment: any, productions: any[]) => {
  if (assignment.status === 'Completed') return false;
  const prod = productions.find(p => p.production_id === assignment.production_id);
  if (prod && isProjectLocked(prod.editing_status)) return false;
  return true;
};
`;

content = content.replace('export const ProductionModule =', helpers + '\nexport const ProductionModule =');
content = content.replace('const ProductionModule =', helpers + '\nconst ProductionModule =');

fs.writeFileSync('src/components/ProductionModule.tsx', content);
