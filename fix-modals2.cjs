const fs = require('fs');
const files = [
  'src/components/production/AssignEditor.tsx',
  'src/components/production/AssignOperationsStaff.tsx',
  'src/components/production/ReassignStaff.tsx',
  'src/components/production/ProductionProofUpload.tsx',
  'src/components/production/ProductionDetails.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/  \),\n  document\.body\n\);\n\};/g, '  ,\n  document.body\n);\n};');
  content = content.replace(/  \),\n  document\.body\n\);\}/g, '  ,\n  document.body\n);}');
  fs.writeFileSync(file, content);
  console.log("Fixed", file);
}
