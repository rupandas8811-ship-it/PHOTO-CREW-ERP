const fs = require('fs');
let content = fs.readFileSync('src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx', 'utf8');

const targetStr = `        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Stage 1: Sales */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-amber-500/40 transition-colors">`;
const replaceStr = `        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Stage 1: Sales */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_sales' }))}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-amber-500/40 transition-colors cursor-pointer"
          >`;
content = content.replace(targetStr, replaceStr);

const targetOps = `          {/* Stage 2: Operations */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-blue-500/40 transition-colors">`;
const replaceOps = `          {/* Stage 2: Operations */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_ops' }))}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-blue-500/40 transition-colors cursor-pointer"
          >`;
content = content.replace(targetOps, replaceOps);

const targetProd = `          {/* Stage 3: Production */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-purple-500/40 transition-colors">`;
const replaceProd = `          {/* Stage 3: Production */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_prod' }))}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-purple-500/40 transition-colors cursor-pointer"
          >`;
content = content.replace(targetProd, replaceProd);

const targetAcc = `          {/* Stage 4: Client Acceptance */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-emerald-500/40 transition-colors">`;
const replaceAcc = `          {/* Stage 4: Client Acceptance */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_acceptance' }))}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-emerald-500/40 transition-colors cursor-pointer"
          >`;
content = content.replace(targetAcc, replaceAcc);

const targetClosed = `          {/* Stage 5: Orders Closed */}
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-emerald-500/40 transition-colors">`;
const replaceClosed = `          {/* Stage 5: Orders Closed */}
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('open-business-owner-card', { detail: 'overview_closed' }))}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col justify-between space-y-2 relative group hover:border-emerald-500/40 transition-colors cursor-pointer"
          >`;
content = content.replace(targetClosed, replaceClosed);

fs.writeFileSync('src/components/analytics/owner/OwnerStaffPerformanceDetailed.tsx', content);
console.log('Success patch stage cards');
