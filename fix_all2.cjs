const fs = require('fs');
let modal = fs.readFileSync('/tmp/workflow_modal.txt', 'utf8');

let endIdx = modal.indexOf('{/* ASSIGNED EDITORS / TEAM POPUP */}');
if (endIdx !== -1) {
  modal = modal.substring(0, endIdx);
}

// Write the rebuilt modal file
let code = fs.readFileSync('build-workflow-modal.cjs', 'utf8');
code = code.replace(/let wpIndex = modal\.indexOf\('\{\/\* WhatsApp Share Generic Popup \*\/\}'\);/, "let wpIndex = modal.indexOf('{/* ASSIGNED EDITORS / TEAM POPUP */}');");
fs.writeFileSync('build-workflow-modal.cjs', code);

