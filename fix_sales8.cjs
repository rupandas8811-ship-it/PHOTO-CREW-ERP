const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const lines = content.split('\n');
lines.splice(11613, 1); // Remove the extra </div>
fs.writeFileSync('src/components/SalesModule.tsx', lines.join('\n'), 'utf8');
console.log('Fixed SalesModule 8');
