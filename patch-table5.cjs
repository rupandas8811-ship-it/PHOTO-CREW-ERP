const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

code = code.replace(/import \{ getProductionStatus, getAutomatedProductionStatus \} from '..\/..\/utils';/g, '');

const dateHelpers = `
  const toInputDateFormat = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return \`\${yyyy}-\${mm}-\${dd}\`;
  };
`;

code = code.replace("const getProductionStatus =", dateHelpers + "\n  const getProductionStatus =");
// Also remove toInputDateFormat from utils import
code = code.replace(/toInputDateFormat, /g, '');

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
