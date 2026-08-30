const fs = require('fs');
const content = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

let depth = 0;
let lines = content.split('\n');
let opened = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') {
      depth++;
      opened.push({line: i + 1, col: j + 1});
    } else if (line[j] === '}') {
      depth--;
      opened.pop();
    }
  }
}

console.log("Unclosed brackets:", opened);
