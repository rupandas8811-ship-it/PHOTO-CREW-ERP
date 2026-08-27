const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
content = content.replace('  );\n};\n\nexport default SalesModule;', '    </div>\n  );\n};\n\nexport default SalesModule;');
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
