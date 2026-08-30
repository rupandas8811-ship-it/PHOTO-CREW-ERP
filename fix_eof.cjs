const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionWorkflowModal.tsx', 'utf8');

const lastIndex = code.lastIndexOf('})()');
if (lastIndex !== -1) {
  code = code.substring(0, lastIndex) + '})()}' + code.substring(lastIndex + 4);
}

fs.writeFileSync('src/components/production/ProductionWorkflowModal.tsx', code);
