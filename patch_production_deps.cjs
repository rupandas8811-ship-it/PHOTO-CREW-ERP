const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

code = code.replace(
  /}, \[currentStaff, editorAssignments\]\);/g,
  '}, [currentStaff, editorAssignments, production]);'
);

fs.writeFileSync('src/components/ProductionModule.tsx', code);
console.log('Patched deps in ProductionModule.tsx');
