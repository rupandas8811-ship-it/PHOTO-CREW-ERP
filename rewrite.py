import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

def replace_component(content, comp_name, new_comp):
    pattern = r"const " + comp_name + r" = \(\{ b \}: \{ b: any \}\) => \{.*?(?=\nconst |\nexport const )"
    return re.sub(pattern, new_comp + "\n", content, flags=re.DOTALL)

new_event_cell = """const StaffEventDetailsCell = ({ b }: { b: any }) => {
  return (
    <div className="relative">
      <div className="font-bold text-zinc-100">{b.eventName}</div>
      <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
        <span>{formatDateDDMMYY(b.eventDate)}</span>
        {b.eventStartTime && b.eventStartTime !== 'N/A' && (
          <>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{formatTime12Hour(b.eventStartTime)}</span>
          </>
        )}
      </div>
    </div>
  );
}"""

content = replace_component(content, "StaffEventDetailsCell", new_event_cell)

# Insert StaffEquipmentDetailsCell before StaffReportingDetailsCell
equipment_cell = """const StaffEquipmentDetailsCell = ({ b, proofStatus }: { b: any, proofStatus: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

  const hasEquipment = b.equipmentItems && b.equipmentItems.length > 0;
  
  if (!hasEquipment) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-xs font-bold font-mono">
        Not Assigned
      </span>
    );
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popupWidth = 320;
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - popupWidth / 2),
        window.innerWidth - popupWidth - 12
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
      
      setCoords({
        left,
        top: openUpward ? rect.top - 6 : rect.bottom + 6,
        openUpward
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target.closest(`.staff-equipment-details-popup-${b.orderId || b.key}`)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest(`.staff-equipment-details-popup-${b.orderId || b.key}`)) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, b.orderId, b.key]);

  const eqStatusText = proofStatus.isHandoverComplete ? 'Handed Over' : proofStatus.assetImageUploaded ? 'Received' : 'Assigned';

  return (
    <div className="relative">
      <button 
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/50 bg-zinc-800/40 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-700/80 hover:border-zinc-600 transition-all font-semibold tracking-wider"
      >
        {b.equipmentItems.length} Equipment Assigned 
        <span className={`transition-transform duration-200 flex items-center justify-center ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && createPortal(
        <div 
          className={`staff-equipment-details-popup-${b.orderId || b.key} fixed z-[110] w-[320px] max-w-[95vw] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden transform origin-${coords.openUpward ? 'bottom' : 'top'} animate-in fade-in zoom-in-95 duration-200 flex flex-col`}
          style={{ 
            left: coords.left, 
            ...(coords.openUpward ? { bottom: window.innerHeight - coords.top } : { top: coords.top }),
            maxHeight: '300px'
          }}
        >
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/60 flex items-center justify-between shrink-0">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Equipment Details</h4>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700/50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-2">
              {b.equipmentItems.map((e: any, eIdx: number) => (
                <div key={eIdx} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-mono font-medium text-white break-words">{e.name}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-zinc-800/60">
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">Equipment Status</span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
                ✓ {eqStatusText}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
"""

content = content.replace("const StaffReportingDetailsCell", equipment_cell + "\nconst StaffReportingDetailsCell")

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
print("Added StaffEquipmentDetailsCell and updated StaffEventDetailsCell")
