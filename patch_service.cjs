const fs = require('fs');
let content = fs.readFileSync('src/services/operationsAssignmentService.ts', 'utf8');

const helper = `
export function getEventRolePadding(eventId: string, slotNumber: number): string {
  const safeId = (eventId || '00000000').replace(/[^a-f0-9]/gi, '0').substring(0, 8).toLowerCase();
  const spaceMap = ['\\u2000', '\\u2001', '\\u2002', '\\u2003'];
  const encoded = safeId.split('').map(c => {
    const val = parseInt(c, 16);
    return spaceMap[val >> 2] + spaceMap[val & 3];
  }).join('');
  return encoded + '\\u00A0'.repeat(slotNumber || 1);
}
`;

content = content.replace(
  "export function generateDeterministicTaskId",
  helper + "\nexport function generateDeterministicTaskId"
);

// Replace the previous padding logic
content = content.replace(
  /staff_role: req.roleName \+ '\\u00A0'\.repeat\(\(\(evId \|\| 'ev'\)\.split\(''\)\.reduce\(\(acc, char\) => acc \+ char\.charCodeAt\(0\), 0\) % 100\) \* 2 \+ req\.slotNumber\),/g,
  "staff_role: req.roleName.trim() + getEventRolePadding(evId, req.slotNumber),"
);

content = content.replace(
  /staff_role: roleName \+ '\\u00A0'\.repeat\(\(\(safeEventId \|\| 'ev'\)\.split\(''\)\.reduce\(\(acc, char\) => acc \+ char\.charCodeAt\(0\), 0\) % 100\) \* 2 \+ slotNumber\),/g,
  "staff_role: roleName.trim() + getEventRolePadding(safeEventId || '', slotNumber),"
);

fs.writeFileSync('src/services/operationsAssignmentService.ts', content);
