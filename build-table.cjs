const fs = require('fs');

const leads = fs.readFileSync('/tmp/prod_leads.txt', 'utf8');

const tableBlock = leads.match(/<table className="w-full border-collapse text-left text-xs text-zinc-300 min-w-max">[\s\S]*?<\/table>/)[0];
const portalBlock = leads.match(/\{\/\* Floating Action Dropdown Menu \*\/\}[\s\S]*?createPortal\([\s\S]*?\),[\s\S]*?document\.body[\s\S]*?\)\}/)[0];
const topCards = leads.match(/<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/)[0];

console.log("Found table block length:", tableBlock.length);
console.log("Found portal block length:", portalBlock.length);
console.log("Found topCards block length:", topCards.length);

