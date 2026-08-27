const fs = require('fs');

let ops = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

ops = ops.replace(
  `export const OperationsLeads: React.FC<OperationsLeadsProps> = ({ currentRole, customers, equipment, staff }) => {\n  useEffect(() => {\n    if (assigningOrderId || receivingFootageOrderId) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [assigningOrderId, receivingFootageOrderId]);\n`,
  'export const OperationsLeads: React.FC<OperationsLeadsProps> = ({ currentRole, customers, equipment, staff }) => {\n'
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', ops, 'utf8');
console.log('Removed duplicate scroll lock');
