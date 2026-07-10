const fs = require('fs');
let code = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

const targetStr = `{/* Floating Action Menu */}
      {activeMenuOrderId && (`;

const replaceStr = `{/* Floating Action Menu */}
      {activeMenuOrderId && createPortal(`;

code = code.replace(targetStr, replaceStr);

const endStr = `        </div>
      )}
    </div>
  );`;

const newEndStr = `        </div>
      ), document.body)}
    </div>
  );`;

code = code.replace(endStr, newEndStr);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', code);
