const fs = require('fs');
let content = fs.readFileSync('src/components/production/ProductionClientAcceptanceManager.tsx', 'utf8');
content = content.replace(
  "if (dbRow.current_status !== 'Client Acceptance' && dbRow.production_status !== 'Client Acceptance' && dbRow.editing_status !== 'Client Acceptance') {",
  "if (String(dbRow.current_status || '').trim().toLowerCase() !== 'client acceptance' && String(dbRow.production_status || '').trim().toLowerCase() !== 'client acceptance' && String(dbRow.editing_status || '').trim().toLowerCase() !== 'client acceptance') {"
);
fs.writeFileSync('src/components/production/ProductionClientAcceptanceManager.tsx', content);
