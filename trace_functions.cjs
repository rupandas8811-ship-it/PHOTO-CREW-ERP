const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');
let openBraces = 0;

for (let i=0; i<lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  
  if (lines[i].match(/const \w+ = /)) {
    console.log(`L${i+1} [${openBraces}] ${lines[i].trim()}`);
  }
}
