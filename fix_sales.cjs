const fs = require('fs');
let content = fs.readFileSync('src/components/SalesModule.tsx');

let startIndex = content.indexOf('Sales Performance Dashboard Grid');
console.log("Total bytes:", content.length);
console.log("Start index:", startIndex);
console.log("Bytes after start:", content.length - startIndex);
