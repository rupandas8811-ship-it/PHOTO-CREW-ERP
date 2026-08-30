const fs = require('fs');
let content = fs.readFileSync('build-workflow-modal.cjs', 'utf8');
let start = content.indexOf('const componentStart = `') + 'const componentStart = `'.length;
let end = content.lastIndexOf('`;');
let str = content.substring(start, end);
let level = 0;
for (let c of str) {
    if (c === '{') level++;
    if (c === '}') level--;
}
console.log("Component start string level diff:", level);
