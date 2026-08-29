const fs = require('fs');
let content = fs.readFileSync('src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx', 'utf8');

const targetOpsCard = `className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between"`;
const replaceOpsCard = `onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_ops' }))}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between cursor-pointer hover:border-blue-500/40 hover:bg-zinc-900 transition-colors"`;

// There are multiple instances of this class name in the Ops section and Prod section.
// Actually, let's just globally replace them for both tabs. The ops tab has blue accents, prod has purple.
// But we can just use the global replace and then let the user click them.
content = content.replace(/className="bg-zinc-950 p-3\.5 rounded-xl border border-zinc-800 flex flex-col justify-between"/g, 
  `onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_prod' }))}
              className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex flex-col justify-between cursor-pointer hover:border-purple-500/40 hover:bg-zinc-900 transition-colors"`);

content = content.replace(/className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between"/g, 
  `onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_ops' }))}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between cursor-pointer hover:border-blue-500/40 hover:bg-zinc-900 transition-colors"`);

fs.writeFileSync('src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx', content);
console.log('Success patch ops prod cards');
