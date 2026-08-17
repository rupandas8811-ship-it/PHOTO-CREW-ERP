const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `        <div 
          onClick={() => setSelectedCard('summary_closed')}
          className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 col-span-2 sm:col-span-1 hover:bg-zinc-900 hover:border-zinc-750 hover:scale-[1.02] cursor-pointer transition-all duration-200"
        >
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold flex items-center justify-between">
            <span>Closed Orders</span>
            <span className="text-[9px] text-zinc-600">Details &rarr;</span>
          </div>
          <div className="text-lg font-black font-mono text-blue-400 mt-0.5">{closedCount} Projects</div>
        </div>`;
const replaceStr = `        <div 
          onClick={() => setSelectedCard('summary_completed')}
          className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 hover:bg-zinc-900 hover:border-zinc-750 hover:scale-[1.02] cursor-pointer transition-all duration-200"
        >
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold flex items-center justify-between">
            <span>Completed</span>
            <span className="text-[9px] text-zinc-600">Details &rarr;</span>
          </div>
          <div className="text-lg font-black font-mono text-amber-400 mt-0.5">{completedCount} Projects</div>
        </div>
        <div 
          onClick={() => setSelectedCard('summary_closed')}
          className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 col-span-2 sm:col-span-1 hover:bg-zinc-900 hover:border-zinc-750 hover:scale-[1.02] cursor-pointer transition-all duration-200"
        >
          <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold flex items-center justify-between">
            <span>Closed Orders</span>
            <span className="text-[9px] text-zinc-600">Details &rarr;</span>
          </div>
          <div className="text-lg font-black font-mono text-blue-400 mt-0.5">{closedCount} Projects</div>
        </div>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch completed card');
