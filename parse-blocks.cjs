const fs = require('fs');
const leads = fs.readFileSync('/tmp/leads_ui.txt', 'utf8');

const afterTable = leads.slice(leads.indexOf('</table>') + 8);
const portalBlockMatch = afterTable.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/);
console.log(portalBlockMatch ? portalBlockMatch[0].slice(-50) : 'no match');
