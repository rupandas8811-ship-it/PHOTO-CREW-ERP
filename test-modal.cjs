const fs = require('fs');
let content = fs.readFileSync('/tmp/workflow_modal.txt', 'utf8');
let level = 0;
for (let c of content) {
    if (c === '{') level++;
    if (c === '}') level--;
}
console.log("Modal level diff:", level);
