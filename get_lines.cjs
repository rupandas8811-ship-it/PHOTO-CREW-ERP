const fs = require('fs');
const text = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8').split('\n');
console.log('3036:', text[3035]);
console.log('8762:', text[8761]);
console.log('9664:', text[9663]);
