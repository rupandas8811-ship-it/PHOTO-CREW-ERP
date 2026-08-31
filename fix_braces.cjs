const fs = require('fs');
const content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
const lines = content.split('\n');
let insideFunc = false;
let openBraces = 0;
let funcStartLine = -1;

for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('const updateOrderStage = async (')) {
    insideFunc = true;
    funcStartLine = i;
  }
  
  if (insideFunc) {
    openBraces += (lines[i].match(/\{/g) || []).length;
    openBraces -= (lines[i].match(/\}/g) || []).length;
    if (openBraces === 0) {
      console.log(`Function updateOrderStage ends at line ${i+1}`);
      insideFunc = false;
    }
  }
}
if (insideFunc) {
  console.log(`Function updateOrderStage is UNCLOSED! Open braces: ${openBraces}`);
}
