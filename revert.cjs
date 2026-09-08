const fs = require('fs');
let content = fs.readFileSync('src/components/sales/useSalesDashboardState.tsx', 'utf8');

content = content.replace(/const \[Number\(finalPackageAmount\) \|\| 0,/g, "const [finalPackageAmount,");
content = content.replace(/const \[Number\(advanceReceived\) \|\| 0,/g, "const [advanceReceived,");

// Wait, I replaced `finalPackageAmount,` globally!
// Let's just fix the specific syntax errors.

fs.writeFileSync('src/components/sales/useSalesDashboardState.tsx', content);
