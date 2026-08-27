import fs from 'fs';
let content = fs.readFileSync('src/components/SalesModule.tsx', 'utf8');
content = content.replace('                  }}\n                  disabled={isSaving}\n}}\n                disabled={isSaving}', '                  }}\n                  disabled={isSaving}');
fs.writeFileSync('src/components/SalesModule.tsx', content, 'utf8');
console.log('Fixed SalesModule');
