const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

code = code.replace(/if \(insErr\) throw insErr;\s*\}\s*\}\)\);/g, `if (insErr) throw insErr;
                 }
               }`);

fs.writeFileSync('src/components/SalesModule.tsx', code);
