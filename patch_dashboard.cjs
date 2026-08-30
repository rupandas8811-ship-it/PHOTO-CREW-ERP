const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

// 1. Remove old modals
code = code.replace(/import \{ AssignEditorModal \} from '.\/production\/AssignEditor';/g, '');
code = code.replace(/import \{ AssignOperationsStaffModal \} from '.\/production\/AssignOperationsStaff';/g, '');
code = code.replace(/import \{ ReassignStaffModal \} from '.\/production\/ReassignStaff';/g, '');
code = code.replace(/import \{ ProductionProofUploadModal \} from '.\/production\/ProductionProofUpload';/g, '');

// 2. Import ProductionWorkflowModal
code = code.replace(/import \{ ProductionDetailsModal \} from '.\/production\/ProductionDetails';/, "import { ProductionDetailsModal } from './production/ProductionDetails';\nimport { ProductionWorkflowModal } from './production/ProductionWorkflowModal';");

// 3. Add state variables for Workflow
const states = `
  const [workflowActionType, setWorkflowActionType] = useState<string | null>(null);
  const [activeWorkflowProd, setActiveWorkflowProd] = useState<any | null>(null);
  
  const handleOpenAssignEditor = (prod: any) => {
    setActiveWorkflowProd(prod);
    setWorkflowActionType('assign_editor');
  };
`;
code = code.replace(/const \[selectedAssignmentForReassign[^;]+;/, states);

// 4. Clean up other modals' states
code = code.replace(/const \[selectedAssignmentForProof[^;]+;/g, '');
code = code.replace(/const \[isAssignEditorOpen[^;]+;/g, '');
code = code.replace(/const \[isAssignOpsOpen[^;]+;/g, '');
code = code.replace(/const \[isReassignOpen[^;]+;/g, '');
code = code.replace(/const \[isProofUploadOpen[^;]+;/g, '');

// 5. Replace modal instances at the end of the file
const modalsToReplace = `
      <AssignEditorModal
        isOpen={isAssignEditorOpen}
        onClose={() => setIsAssignEditorOpen(false)}
        order={selectedOrder}
        productionItem={selectedProduction}
        assignmentToEdit={selectedTask}
      />

      <AssignOperationsStaffModal
        isOpen={isAssignOpsOpen}
        onClose={() => setIsAssignOpsOpen(false)}
        order={selectedOrder}
        operationItem={selectedOperation}
      />

      <ReassignStaffModal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        assignment={selectedAssignmentForReassign}
      />

      <ProductionProofUploadModal
        isOpen={isProofUploadOpen}
        onClose={() => setIsProofUploadOpen(false)}
        assignment={selectedAssignmentForProof}
      />
`;
const newModal = `
      <ProductionWorkflowModal
        activeWorkflowProd={activeWorkflowProd}
        workflowActionType={workflowActionType}
        setWorkflowActionType={setWorkflowActionType}
        setActiveWorkflowProd={setActiveWorkflowProd}
        orders={orders}
        leads={leads}
        quotations={quotations}
        editorAssignments={editorAssignments}
        productionStaff={productionStaff}
        operationsList={operations}
        rawFootage={rawFootage}
        logs={logs}
        payments={payments}
        refreshData={refreshData}
        pushInsert={pushInsert}
        pushUpdate={pushUpdate}
        logActivity={logActivity}
        currentUserName={currentUserName}
      />
`;
// Because exact multiline matching is tricky with replace, I will use split/join trick
const parts = code.split('<AssignEditorModal');
if (parts.length > 1) {
  const afterModals = parts[1].split('</ProductionProofUploadModal>');
  if (afterModals.length > 1) {
    code = parts[0] + newModal + afterModals[1];
  }
}

// 6. Update ProductionTaskTable props
code = code.replace(/onAssignEditor=\{openAssignEditor\}/, 'handleOpenAssignEditor={handleOpenAssignEditor}');

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
