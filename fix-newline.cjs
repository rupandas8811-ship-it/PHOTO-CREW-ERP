const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');
code = code.replace(/\\nimport/g, "\\nimport");
fs.writeFileSync('src/components/ProductionModule.tsx', code);
