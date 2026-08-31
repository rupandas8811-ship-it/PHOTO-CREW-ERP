const fs = require('fs');
let content = fs.readFileSync('src/components/RoleContext.tsx', 'utf8');
content = content.replace(
  "const isClosedStatus = (s?: string) => \n        ['Order Closed', 'Closed', 'Project Closed', 'Completed', 'Project Completed'].includes(String(s || '').trim());",
  "const isClosedStatus = (s?: string) => \n        ['order closed', 'closed', 'project closed', 'completed', 'project completed'].includes(String(s || '').trim().toLowerCase());"
);
fs.writeFileSync('src/components/RoleContext.tsx', content);
