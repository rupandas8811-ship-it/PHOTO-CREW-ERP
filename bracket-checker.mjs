import fs from 'fs';
const code = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
let depth = 0;
const lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
  }
}
console.log('Final depth:', depth);
