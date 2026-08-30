const fs = require('fs');
const content = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

const counts = { '{': 0, '}': 0, '(': 0, ')': 0, '<': 0, '>': 0 };
for (let i = 0; i < content.length; i++) {
  if (counts[content[i]] !== undefined) {
    counts[content[i]]++;
  }
}
console.log(counts);
