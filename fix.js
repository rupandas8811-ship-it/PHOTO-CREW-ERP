const fs = require('fs');
let text = fs.readFileSync('src/components/operations/OperationsStaffManagement.tsx', 'utf8');
text = text.replace(/const authEmail = \`staff_\w*\$\{form\.mobile\.replace\(\/\[\^0-9\]\/g, ''\)\}\@staff\.photocrew\.com\`;/, 
"const generatedPrefix = form.name.toLowerCase().replace(/\\\\s+/g, '');\n            const authEmail = `\\${generatedPrefix}@photocrew.com`;");
fs.writeFileSync('src/components/operations/OperationsStaffManagement.tsx', text);
