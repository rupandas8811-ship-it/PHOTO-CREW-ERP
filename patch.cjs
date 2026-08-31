const fs = require('fs');
let code = fs.readFileSync('src/components/BusinessOwnerDashboard.tsx', 'utf8');

const target = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            {isBusinessOwner && onReject && (
              <button
                onClick={onReject}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer flex justify-center items-center gap-1.5"
              >
                <span>Reject Back to Production</span>
              </button>
            )}
            {isBusinessOwner && (
              <button
                onClick={onApprove}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-lg flex justify-center items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve & Close Order</span>
              </button>
            )}
          </div>`;

const replace = `<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto relative">
            {approveError && (
              <div className="absolute bottom-[calc(100%+24px)] right-0 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold text-center flex items-center justify-center gap-2 z-10 w-full sm:w-max max-w-sm whitespace-normal shadow-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>ORDER CLOSE FAILED: {approveError}</span>
              </div>
            )}
            <button
              onClick={onClose}
              disabled={isApproving}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {isBusinessOwner && onReject && (
              <button
                onClick={onReject}
                disabled={isApproving}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/20 transition-all cursor-pointer flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Reject Back to Production</span>
              </button>
            )}
            {isBusinessOwner && (
              <button
                onClick={handleApproveSubmit}
                disabled={isApproving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-lg flex justify-center items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Approving & Closing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve & Close Order</span>
                  </>
                )}
              </button>
            )}
          </div>`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/components/BusinessOwnerDashboard.tsx', code, 'utf8');
  console.log("Replaced");
} else {
  console.log("Not found");
}
