const fs = require('fs');
let content = fs.readFileSync('src/components/StaffModule.tsx', 'utf8');

content = content.replace(/capture="environment"/g, '');

fs.writeFileSync('src/components/StaffModule.tsx', content);
console.log("Patched capture");
