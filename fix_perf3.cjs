const fs = require('fs');
let code = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');

const regex = /for \(const ev of crmEvents\) \{([\s\S]*?)if \(insErr\) throw insErr;\s*\}\s*\}/;

const match = code.match(regex);
if (match) {
  const replacement = `await Promise.all(crmEvents.map(async (ev) => {${match[1]}if (insErr) throw insErr;
                 }
               }));`;
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/components/SalesModule.tsx', code);
  console.log('Parallelized handleSaveStep 4 loop.');
} else {
  console.log('Could not find old loop.');
}
