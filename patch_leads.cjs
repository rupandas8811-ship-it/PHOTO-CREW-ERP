const fs = require('fs');
let content = fs.readFileSync('src/components/operations/OperationsLeads.tsx', 'utf8');

content = content.replace(
  /import \{[^\}]*\} from '\.\.\/\.\.\/services\/operationsAssignmentService';/s,
  (match) => {
    if (match.includes('getEventRolePadding')) return match;
    return match.replace('generateDeterministicAssignmentId', 'generateDeterministicAssignmentId, getEventRolePadding');
  }
);

content = content.replace(
  /const stRole = \(st\.staff_role \|\| 'Staff'\)\.trim\(\) \+ '\\u00A0'\.repeat\(\(\(evId \|\| 'ev'\)\.split\(''\)\.reduce\(\(acc, char\) => acc \+ char\.charCodeAt\(0\), 0\) % 100\) \* 2 \+ stSlotNum\);/g,
  "const stRole = (st.staff_role || 'Staff').trim() + getEventRolePadding(evId, stSlotNum);"
);

fs.writeFileSync('src/components/operations/OperationsLeads.tsx', content);
