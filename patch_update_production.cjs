const fs = require('fs');
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
content = content.replace(
  "targetProd.current_status === 'Client Acceptance' || \n        targetProd.production_status === 'Client Acceptance';",
  "String(targetProd.current_status || '').trim().toLowerCase() === 'client acceptance' || \n        String(targetProd.production_status || '').trim().toLowerCase() === 'client acceptance';"
);
fs.writeFileSync('src/components/RoleContext.tsx', content);
