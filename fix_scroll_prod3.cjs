const fs = require('fs');
let prod = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const insertAfter = "const [activeWorkflowProd, setActiveWorkflowProd] = useState<Production | null>(null);";
const replacement = "const [activeWorkflowProd, setActiveWorkflowProd] = useState<Production | null>(null);\n  useEffect(() => {\n    if (activeWorkflowProd) {\n      document.body.style.overflow = 'hidden';\n    } else {\n      document.body.style.overflow = 'unset';\n    }\n    return () => { document.body.style.overflow = 'unset'; };\n  }, [activeWorkflowProd]);\n";

prod = prod.replace(insertAfter, replacement);

fs.writeFileSync('src/components/ProductionModule.tsx', prod, 'utf8');
console.log('Scroll lock moved correctly');
