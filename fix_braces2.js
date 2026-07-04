import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
const lines = content.split('\n');

for (let i = 3540; i < 3560; i++) {
  if (lines[i].includes('}')) {
    if (lines[i+1] && lines[i+1].includes('}') && lines[i+2] && lines[i+2].includes('if (!salesStaffMobile')) {
      console.log('Found it around line', i);
      lines.splice(i+1, 8); // remove the extra } and the if block
      break;
    }
  }
}
fs.writeFileSync('src/components/SalesModule.tsx', lines.join('\n'), 'utf-8');
console.log('Fixed');
