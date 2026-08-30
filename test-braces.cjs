const fs = require('fs');
const content = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');

let level = 0;
let lines = content.split('\n');
for (let i=0; i<lines.length; i++) {
    for (let c of lines[i]) {
        if (c === '{') level++;
        if (c === '}') level--;
    }
}
console.log("Level diff:", level);
