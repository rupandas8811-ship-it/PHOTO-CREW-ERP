import fs from 'fs';

let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

content = content.replace(/finalAmt === "" \? null : Number\(finalAmt\)/g, "finalAmt");

fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf-8');
console.log("Fixed TS error");
