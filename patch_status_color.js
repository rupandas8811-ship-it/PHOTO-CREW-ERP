import fs from 'fs';
let content = fs.readFileSync('src/components/ui/StatusText.tsx', 'utf-8');

const targetStr = `  if (s === 'completed' || s === 'closed') return 'text-green-700';`;
const replaceStr = `  if (s === 'completed' || s === 'closed') return 'text-green-700';
  if (s === 'lost lead') return 'text-rose-500 font-bold';`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/ui/StatusText.tsx', content, 'utf-8');
console.log("Patched status text for lost lead");
