const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const lines = content.split('\n');
lines.splice(8529, 0, '              )}');
fs.writeFileSync('src/components/SalesModule.tsx', lines.join('\n'), 'utf8');
console.log('Fixed SalesModule 4');
