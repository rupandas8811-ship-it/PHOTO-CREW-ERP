const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

prod = prod.replace(
  'export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {',
  `export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {\n  useEffect(() => {\n    if (activeWorkflowProd) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [activeWorkflowProd]);\n`
);

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');
console.log('Scroll lock added to ProductionModule');
