const fs = require('fs');
const { parse } = require('@babel/parser');

try {
  const code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');
  parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  console.log("No AST errors!");
} catch (e) {
  console.log(e);
}
