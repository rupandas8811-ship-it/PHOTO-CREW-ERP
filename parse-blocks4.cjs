const fs = require('fs');
const helpers = fs.readFileSync('/tmp/prod_helpers.txt', 'utf8');

const replaced = helpers.replace(/const filteredLeadsList = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);/, '').replace(/const count.*?;/g, '');

let d = 0;
for (let i = 0; i < replaced.length; i++) {
  if (replaced[i] === '{') d++;
  if (replaced[i] === '}') d--;
}
console.log("helpers depth:", d);
