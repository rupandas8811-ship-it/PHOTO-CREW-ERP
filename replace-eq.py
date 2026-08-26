with open("src/components/operations/OperationsLeads.tsx", "r") as f:
    content = f.read()

target = "export const OperationsLeads: React.FC = () => {"
replacement = """const EquipmentAssignedCell = ({ equipmentList, equipmentStatusText }: { equipmentList: string[], equipmentStatusText: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (equipmentList.length === 0) {
    return <span className="text-zinc-500 font-semibold text-xs font-mono">Not Assigned</span>;
  }

  if (equipmentList.length === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        {equipmentList[0]}
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors font-bold text-xs font-mono"
      >
        <span>{equipmentList.length} Equipment Assigned</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 mt-2 w-64 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/50 overflow-hidden transform left-1/2 -translate-x-1/2">
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/60">
              <h4 className="text-xs font-bold text-zinc-300 text-left">Equipment Assigned — {equipmentList.length}</h4>
            </div>
            <div className="max-h-48 overflow-y-auto p-2 space-y-1">
              {equipmentList.map((gear, idx) => (
                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-800/30">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="text-xs font-mono text-zinc-300 whitespace-normal text-left leading-tight break-words">{gear}</span>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 bg-zinc-800/80 border-t border-zinc-700/60 text-left">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Status</div>
              <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> <span className="whitespace-normal break-words">{equipmentStatusText.replace('✅ ', '')}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const OperationsLeads: React.FC = () => {"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/components/operations/OperationsLeads.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Target not found")
