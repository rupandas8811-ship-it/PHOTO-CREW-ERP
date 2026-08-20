const fs = require('fs');
const file = 'src/components/ProductionModule.tsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure FileText is imported
if (!content.includes('FileText')) {
  content = content.replace("import { ", "import { FileText, ");
  fs.writeFileSync(file, content);
}
