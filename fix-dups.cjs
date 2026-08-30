const fs = require('fs');

let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

const duplicatesToRemove = [
  /const \[selectedOrder, setSelectedOrder\] = useState<any>\(null\);\n/g,
  /const \[selectedProduction, setSelectedProduction\] = useState<any>\(null\);\n/g,
  /const \[selectedTaskToEdit, setSelectedTaskToEdit\] = useState<any>\(null\);\n/g,
  /const \[selectedOperation, setSelectedOperation\] = useState<any>\(null\);\n/g,
  /const \[selectedAssignmentForReassign, setSelectedAssignmentForReassign\] = useState<any>\(null\);\n/g,
  /const \[selectedAssignmentForProof, setSelectedAssignmentForProof\] = useState<any>\(null\);\n/g
];

duplicatesToRemove.forEach(regex => {
  code = code.replace(regex, '');
});

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
