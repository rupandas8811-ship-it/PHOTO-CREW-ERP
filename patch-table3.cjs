const fs = require('fs');

// We will fetch the original from fix-table2 which was clean.
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

// The duplicate props were operationsList and editorAssignments.
// Let's just fix the duplicates.
const lines = code.split('\n');
let newLines = [];
let seen = new Set();
let inProps = false;
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('export const ProductionTaskTable = ({')) {
    inProps = true;
  }
  if (inProps && line.includes('}: any) => {')) {
    inProps = false;
  }
  
  if (inProps) {
    let propName = line.trim().split('=')[0].split(':')[0].trim();
    if (['operationsList', 'editorAssignments', 'getRawFootageStatus', 'getAssignedEditorsList'].includes(propName)) {
      if (seen.has(propName)) {
        continue;
      }
      seen.add(propName);
    }
  }
  
  // replace getanyStatus -> getProductionStatus
  line = line.replace(/getanyStatus/g, 'getProductionStatus');
  line = line.replace(/getAutomatedanyStatus/g, 'getAutomatedProductionStatus');
  line = line.replace(/isanyStaffAssignment/g, 'isProductionStaffAssignment');
  line = line.replace(/staffAssignments/g, 'editorAssignments');
  line = line.replace(/operations \||operations\)/g, 'operationsList |');

  newLines.push(line);
}

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', newLines.join('\n'));
console.log('cleaned');
