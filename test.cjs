const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
let openBraces = 0;
let lines = content.split('\n');
for (let i=0; i<lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (openBraces < 0) { console.log("Extra closing brace on line " + (i+1)); break; }
}
console.log("Final brace count:", openBraces);
