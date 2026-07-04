import fs from 'fs';
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');
let openBraces = (content.match(/\{/g) || []).length;
let closeBraces = (content.match(/\}/g) || []).length;
console.log('Open:', openBraces, 'Close:', closeBraces);
