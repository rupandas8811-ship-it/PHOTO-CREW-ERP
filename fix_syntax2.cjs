const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/Number\(advanceReceived\) \|\| 0,/g, "advanceReceived,");
content = content.replace(/Number\(finalPackageAmount\) \|\| 0,/g, "finalPackageAmount,");

// But I still need to pass Number(finalPackageAmount) to confirmOrder:
content = content.replace(/await confirmOrder\(\n        createdLeadId!,\n        selectedPkgsNames,\n        finalPackageAmount,\n        advanceReceived,/g, "await confirmOrder(\\n        createdLeadId!,\\n        selectedPkgsNames,\\n        Number(finalPackageAmount) || 0,\\n        Number(advanceReceived) || 0,");

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
