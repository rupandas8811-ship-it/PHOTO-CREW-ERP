const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

// Remove the block
prod = prod.replace(
  `export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {\n  useEffect(() => {\n    if (activeWorkflowProd) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [activeWorkflowProd]);\n`,
  'export const ProductionModule: React.FC<ProductionModuleProps> = ({ activeSubTab, setActiveSubTab }) => {\n'
);

// Add it after activeWorkflowProd is declared
const insertAfter = "const [activeWorkflowProd, setActiveWorkflowProd] = useState<ProductionProject | null>(null);";
const replacement = "const [activeWorkflowProd, setActiveWorkflowProd] = useState<ProductionProject | null>(null);\n  useEffect(() => {\n    if (activeWorkflowProd) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [activeWorkflowProd]);\n";

prod = prod.replace(insertAfter, replacement);

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');
console.log('Scroll lock moved');
