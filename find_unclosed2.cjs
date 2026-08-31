const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');
let openBraces = 0;

for (let i=0; i<lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (openBraces < 0) { console.log(`Extra closing brace at ${i+1}`); }
  if (lines[i].includes('export const RoleProvider')) { console.log(`RoleProvider starts at ${i+1}`); }
  if (lines[i].includes('</RoleContext.Provider>')) { console.log(`RoleContext.Provider ends at ${i+1}, open braces: ${openBraces}`); }
}
