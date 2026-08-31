const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
let openBraces = 0;
let lines = content.split('\n');
for (let i=0; i<lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
}
console.log("Final brace count:", openBraces);
if (openBraces > 0) {
  for (let i=0; i<openBraces; i++) {
    fs.appendFileSync('src/components/RoleContext.tsx', '}\n');
  }
}
