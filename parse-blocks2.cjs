const fs = require('fs');
const leads = fs.readFileSync('/tmp/leads_ui.txt', 'utf8');
const tableStart = leads.indexOf('<table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">');
const tableEnd = leads.indexOf('</table>') + 8;
const tableBlock = leads.slice(tableStart, tableEnd);

let depth = 0;
for(let i=0; i<tableBlock.length; i++) {
  if (tableBlock[i] === '{') depth++;
  if (tableBlock[i] === '}') depth--;
}
console.log("tableBlock depth:", depth);

const afterTable = leads.slice(tableEnd);
const portalBlockMatch = afterTable.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/);
const portalBlock = portalBlockMatch[0];

let depth2 = 0;
for(let i=0; i<portalBlock.length; i++) {
  if (portalBlock[i] === '{') depth2++;
  if (portalBlock[i] === '}') depth2--;
}
console.log("portalBlock depth:", depth2);
