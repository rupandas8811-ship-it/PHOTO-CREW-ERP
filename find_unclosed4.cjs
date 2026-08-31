const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');
let openBraces = 0;

for (let i=0; i<5090; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (i > 5060) {
    console.log(`${i+1}: [${openBraces}] ${lines[i]}`);
  }
}
