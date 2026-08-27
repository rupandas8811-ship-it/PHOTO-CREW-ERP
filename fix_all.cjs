const fs = require('fs');

const files = ['src/components/SalesModule.tsx', 'src/components/ProductionModule.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const index = content.indexOf('\x00'); // Check for null bytes or other weird chars?
}
