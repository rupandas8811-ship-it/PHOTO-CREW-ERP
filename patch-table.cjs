const fs = require('fs');

let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

const helpers = fs.readFileSync('/tmp/extracted_helpers.txt', 'utf8');

const importXlsx = `import * as XLSX from 'xlsx';\nimport { StatusText } from '../ui/StatusText';\n`;
code = code.replace("import { createPortal } from 'react-dom';", importXlsx + "import { createPortal } from 'react-dom';");

const newProps = `  operationsList = [],
  editorAssignments = [],
  productionStaff = [],
  rawFootage = [],`;

code = code.replace(/rawFootage = \[\],/, newProps);

const fixProductionType = code.replace(/Production/g, 'any');

const bodyStart = fixProductionType.indexOf('const resolveOrderAndLead');
const patchedCode = fixProductionType.slice(0, bodyStart) + helpers.replace(/Production/g, 'any') + "\n" + fixProductionType.slice(bodyStart);

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', patchedCode);
console.log('patched');
