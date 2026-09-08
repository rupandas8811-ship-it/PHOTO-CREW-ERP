const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/await confirmOrder\(\\n        createdLeadId!,\\n        selectedPkgsNames,\\n        Number\(finalPackageAmount\) \|\| 0,\\n        Number\(advanceReceived\) \|\| 0,/g, 
  "await confirmOrder(\n        createdLeadId!,\n        selectedPkgsNames,\n        Number(finalPackageAmount) || 0,\n        Number(advanceReceived) || 0,"
);

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
