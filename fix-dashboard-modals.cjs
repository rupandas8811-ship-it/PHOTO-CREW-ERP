const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

code = code.replace(/<AssignEditorModal[\s\S]*?assignmentToEdit=\{selectedTaskToEdit\}\s*\/>/g, '');
code = code.replace(/<AssignOperationsStaffModal[\s\S]*?operationItem=\{selectedOperation\}\s*\/>/g, '');
code = code.replace(/<ReassignStaffModal[\s\S]*?assignment=\{selectedAssignmentForReassign\}\s*\/>/g, '');
code = code.replace(/<ProductionProofUploadModal[\s\S]*?assignment=\{selectedAssignmentForProof\}\s*\/>/g, '');

code = code.replace(/import \{ AssignEditorModal \} from '.\/production\/AssignEditorModal';\n/g, '');
code = code.replace(/import \{ AssignOperationsStaffModal \} from '.\/production\/AssignOperationsStaffModal';\n/g, '');
code = code.replace(/import \{ ReassignStaffModal \} from '.\/production\/ReassignStaffModal';\n/g, '');
code = code.replace(/import \{ ProductionProofUploadModal \} from '.\/production\/ProductionProofUploadModal';\n/g, '');

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
