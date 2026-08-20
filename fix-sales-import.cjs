const fs = require('fs');
const file = 'src/components/SalesModule.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('FileText')) {
  content = content.replace("import { ", "import { FileText, ");
  fs.writeFileSync(file, content);
} else if (content.includes('FileText') && !content.match(/import\s+{[^}]*FileText[^}]*}\s+from\s+['"]lucide-react['"]/)) {
  content = content.replace("import { ", "import { FileText, ");
  fs.writeFileSync(file, content);
}
