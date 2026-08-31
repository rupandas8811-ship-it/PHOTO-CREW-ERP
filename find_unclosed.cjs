const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');
let openBraces = 0;

for (let i=0; i<lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (lines[i].includes('export const useRole')) {
    console.log(`At useRole (line ${i+1}), open braces: ${openBraces}`);
  }
}
console.log("Total open braces:", openBraces);
