const fs = require('fs');

let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

// 1. Define statusFilter
code = code.replace(/const \[priorityFilter/g, 'const [statusFilter, setStatusFilter] = useState("All");\n  const [priorityFilter');

// 2. Fix operations -> operationsList, staffAssignments -> editorAssignments
code = code.replace(/operations \|\|/g, 'operationsList ||');
code = code.replace(/staffAssignments \|\|/g, 'editorAssignments ||');
code = code.replace(/staffAssignments\)/g, 'editorAssignments)');

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
