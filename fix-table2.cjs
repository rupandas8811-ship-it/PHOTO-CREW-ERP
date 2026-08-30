const fs = require('fs');
const content = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');
const fixed = content.replace('  const downloadPDFReport = () => {', '');
fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', fixed);
