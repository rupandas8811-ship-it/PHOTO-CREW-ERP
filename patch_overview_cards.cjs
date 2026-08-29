const fs = require('fs');
let content = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const targetStr = `          </div>

          {/* Quick Overview Summary Banner */}`;

const replaceStr = `          </div>

          {/* PERFORMANCE OVERVIEW CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-6">
            {/* Sales Performance */}
            <div 
              onClick={() => setSelectedCard('overview_sales')}
              className="bg-gradient-to-b from-amber-950/20 to-zinc-950 border border-amber-500/20 rounded-2xl p-5 shadow-xl hover:border-amber-500/60 hover:from-amber-950/30 hover:to-zinc-900 transition-all duration-200 relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-400/90">
                  Sales Performance
                </span>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {salesStats.confirmed} <span className="text-sm text-zinc-500">/ {salesStats.total}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between gap-1">
                  <span>Confirmed Leads</span>
                  <span className="text-amber-400 font-bold font-mono">{salesStats.rate}% CR</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="group-hover:text-amber-400 transition-colors font-bold">Click to view details</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-500/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* Operations Performance */}
            <div 
              onClick={() => setSelectedCard('overview_ops')}
              className="bg-gradient-to-b from-blue-950/20 to-zinc-950 border border-blue-500/20 rounded-2xl p-5 shadow-xl hover:border-blue-500/60 hover:from-blue-950/30 hover:to-zinc-900 transition-all duration-200 relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-400/90">
                  Operations Performance
                </span>
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {opsStats.completed} <span className="text-sm text-zinc-500">/ {opsStats.total}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between gap-1">
                  <span>Completed Events</span>
                  <span className="text-blue-400 font-bold font-mono">{opsStats.rate}% Done</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="group-hover:text-blue-400 transition-colors font-bold">Click to view details</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>

            {/* Production Performance */}
            <div 
              onClick={() => setSelectedCard('overview_prod')}
              className="bg-gradient-to-b from-pink-950/20 to-zinc-950 border border-pink-500/20 rounded-2xl p-5 shadow-xl hover:border-pink-500/60 hover:from-pink-950/30 hover:to-zinc-900 transition-all duration-200 relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-pink-400/90">
                  Production Performance
                </span>
                <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                  <Video className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                  {prodStats.completed} <span className="text-sm text-zinc-500">/ {prodStats.total}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between gap-1">
                  <span>Completed Projects</span>
                  <span className="text-pink-400 font-bold font-mono">{prodStats.rate}% Done</span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-pink-500/10 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="group-hover:text-pink-400 transition-colors font-bold">Click to view details</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-pink-500/50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Overview Summary Banner */}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', content);
console.log('Success patch overview cards');
