const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(11590, 11630).join('\n'));
