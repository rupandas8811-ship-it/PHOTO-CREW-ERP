const fs = require('fs');
let code = fs.readFileSync('src/components/production/ProductionTaskTable.tsx', 'utf8');

code = code.replace(/handleOpenResendReviewPopup = \(\) => \{\},/g, '');
code = code.replace(/handleOpenClientAcceptance = \(\) => \{\},/g, '');

fs.writeFileSync('src/components/production/ProductionTaskTable.tsx', code);
