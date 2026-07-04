import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const targetStr = 'className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${`';
const replaceStr = 'className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${';

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed syntax");
