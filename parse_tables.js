const fs = require('fs');
const content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('<table')) console.log(`Line ${i+1}: ${line.trim()}`);
});
