const fs = require('fs');
const content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
const exportIndex = content.indexOf('export default SalesModule;');
if (exportIndex !== -1) {
  const cleanContent = content.substring(0, exportIndex + 'export default SalesModule;'.length) + '\n';
  fs.writeFileSync('src/components/SalesModule.tsx', cleanContent, 'utf8');
  console.log('Fixed file');
} else {
  console.log('Export not found');
}
