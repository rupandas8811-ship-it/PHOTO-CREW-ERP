const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionModule.tsx', 'utf8');

const startStr = "{/* STEP-BY-STEP INTERACTIVE WORKFLOW MODALS */}";
const endStr = "{/* ASSIGNED EDITORS / TEAM POPUP */}";
const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const props = `
      <ProductionWorkflowModal 
        activeWorkflowProd={activeWorkflowProd}
        workflowActionType={workflowActionType}
        setWorkflowActionType={setWorkflowActionType}
        setActiveWorkflowProd={setActiveWorkflowProd}
        orders={orders}
        leads={leads}
        quotations={quotations}
        editorAssignments={editorAssignments}
        productionStaff={staff}
        operationsList={operationsList}
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
    
    code = code.substring(0, startIndex) + props + "\\n      " + code.substring(endIndex);
    fs.writeFileSync('src/components/ProductionModule.tsx', code);
    console.log("Replaced modal block.");
} else {
    console.log("Could not find start/end.");
}
