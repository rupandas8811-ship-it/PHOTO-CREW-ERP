const fs = require('fs');
let code = fs.readFileSync('src/components/ProductionDashboardModule.tsx', 'utf8');

const useRoleMatch = code.match(/const\s*\{\s*orders\s*=\s*\[\],\s*production\s*=\s*\[\],\s*editorAssignments\s*=\s*\[\],\s*operations\s*=\s*\[\],\s*refreshData,\s*pushUpdate,\s*logActivity,\s*currentUserName\s*\}\s*=\s*useRole\(\);/m);

if (useRoleMatch) {
  const newUseRole = `const { 
    orders = [], 
    production = [], 
    editorAssignments = [], 
    operations = [],
    staff = [],
    productionStaff = [],
    rawFootage = [],
    logs = [],
    payments = [],
    leads = [],
    refreshData,
    pushUpdate,
    logActivity,
    currentUserName
  } = useRole();`;
  code = code.replace(useRoleMatch[0], newUseRole);
}

const tableMatch = code.match(/<ProductionTaskTable[\s\S]*?\/>/);
if (tableMatch) {
  const newTable = `<ProductionTaskTable
          activeSubTab={activeSubTab}
          orders={orders}
          productionList={production}
          editorAssignments={editorAssignments}
          operationsList={operations}
          productionStaff={productionStaff}
          rawFootage={rawFootage}
          logs={logs}
          payments={payments}
          leadsData={leads}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          onSelectProject={openProjectDetails}
          onAssignEditor={openAssignEditor}
          onAssignOps={openAssignOps}
          onReassignStaff={openReassign}
          onUploadProof={openUploadProof}
          onUpdateStatus={handleUpdateStatus}
          onPreviewImage={setImagePreview}
        />`;
  code = code.replace(tableMatch[0], newTable);
}

fs.writeFileSync('src/components/ProductionDashboardModule.tsx', code);
console.log('patched dashboard');
