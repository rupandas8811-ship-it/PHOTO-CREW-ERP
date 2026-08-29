const fs = require('fs');
let code = fs.readFileSync('/app/applet/src/components/SalesModule.tsx', 'utf8');
console.log(code.substring(code.length - 1000));
