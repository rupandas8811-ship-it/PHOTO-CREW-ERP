const fs = require('fs');
let states = fs.readFileSync('/tmp/workflow_states.txt', 'utf8');

// Find the start of handleOpenAssignEditor and trim everything from it onwards
let idx = states.indexOf('const handleOpenAssignEditor =');
if (idx !== -1) {
  states = states.substring(0, idx);
}

fs.writeFileSync('/tmp/workflow_states.txt', states);
