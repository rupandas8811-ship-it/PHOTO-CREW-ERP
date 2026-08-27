const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf-8');

const str = "{false && selectedLead && (";
const startIndex = content.indexOf(str) + str.length - 1; // start at '('

let depth = 0;
for(let i=startIndex; i<content.length; i++) {
    if (content[i] === '(') depth++;
    else if (content[i] === ')') depth--;
    if (depth === 0) {
        console.log("Closing bracket at:", i);
        console.log("Line number:", content.substring(0, i).split('\n').length);
        console.log(content.substring(i-20, i+20));
        break;
    }
}
