const fs = require('fs');

// Patch ProductionModule.tsx
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Find a good place to insert the useEffect. Let's find: `useEffect(() => {` and insert it above.
// Better yet, just insert it inside the component.
// `export const ProductionModule = () => {`
prod = prod.replace(
  'export const ProductionModule = () => {',
  `export const ProductionModule = () => {\n  useEffect(() => {\n    if (activeWorkflowProd) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [activeWorkflowProd]);\n`
);

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');

// Patch OperationsLeads.tsx
let ops = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

ops = ops.replace(
  'export const OperationsLeads: React.FC<OperationsLeadsProps> = ({ currentRole, customers, equipment, staff }) => {',
  `export const OperationsLeads: React.FC<OperationsLeadsProps> = ({ currentRole, customers, equipment, staff }) => {\n  useEffect(() => {\n    if (assigningOrderId || receivingFootageOrderId) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [assigningOrderId, receivingFootageOrderId]);\n`
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', ops, 'utf8');
console.log('Scroll lock added');
