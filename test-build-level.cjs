const fs = require('fs');
let content = fs.readFileSync('build-workflow-modal.cjs', 'utf8');
let level = 0;
for (let c of content) {
    if (c === '{') level++;
    if (c === '}') level--;
}
console.log("Build script level diff:", level);
