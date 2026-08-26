import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

def replace_component(content, comp_name, new_comp):
    pattern = r"const " + comp_name + r" = \(\{ b \}: \{ b: any \}\) => \{.*?(?=\nconst |\nexport const )"
    return re.sub(pattern, new_comp + "\n", content, flags=re.DOTALL)

new_event_cell = """const StaffEventDetailsCell = ({ b }: { b: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

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
        !target.closest(`.staff-event-details-popup-${b.orderId || b.key}`)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest(`.staff-event-details-popup-${b.orderId || b.key}`)) {
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

  const endDate = b.eventEndDate && b.eventEndDate !== 'N/A' ? b.eventEndDate : b.eventDate;
  const hasEndTime = b.eventEndTime && b.eventEndTime !== 'N/A';

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
      <button 
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-700/50 bg-zinc-800/40 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-zinc-600 transition-all font-semibold uppercase tracking-wider"
      >
        View Details 
        <span className={`transition-transform duration-200 flex items-center justify-center ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && createPortal(
        <div 
          className={`staff-event-details-popup-${b.orderId || b.key} fixed z-[110] w-[320px] max-w-[95vw] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden transform origin-${coords.openUpward ? 'bottom' : 'top'} animate-in fade-in zoom-in-95 duration-200`}
          style={{ 
            left: coords.left, 
            ...(coords.openUpward ? { bottom: window.innerHeight - coords.top } : { top: coords.top }) 
          }}
        >
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/60 flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Event Details</h4>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700/50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-0 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-zinc-800/60">
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400 w-1/3">Event Name</td>
                  <td className="py-2.5 px-4 font-medium text-white">{b.eventName}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">Start Date</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-amber-400">{formatDateDDMMYY(b.eventDate)}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">Start Time</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-amber-400">{b.eventStartTime && b.eventStartTime !== 'N/A' ? formatTime12Hour(b.eventStartTime) : 'Not set'}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">End Date</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-zinc-300">{formatDateDDMMYY(endDate)}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">End Time</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-zinc-300">{hasEndTime ? formatTime12Hour(b.eventEndTime) : 'Not set'}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">Shoot Type</td>
                  <td className="py-2.5 px-4 font-medium text-white">{b.shootType && b.shootType !== 'N/A' ? b.shootType : 'Not set'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}"""

new_reporting_cell = """const StaffReportingDetailsCell = ({ b }: { b: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

  const repDate = b.reportingDate || 'N/A';
  const repTime = b.reportingTime || 'N/A';

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
      const openUpward = spaceBelow < 250 && spaceAbove > spaceBelow;
      
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
        !target.closest(`.staff-reporting-details-popup-${b.orderId || b.key}`)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest(`.staff-reporting-details-popup-${b.orderId || b.key}`)) {
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

  return (
    <div className="relative">
      <div className="text-[11px] text-zinc-300 font-mono flex items-center gap-1.5 flex-wrap">
        {repDate !== 'N/A' ? (
          <>
            <span className="font-bold">{formatDateDDMMYY(repDate)}</span>
            {repTime !== 'N/A' && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 font-medium">{formatTime12Hour(repTime)}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-zinc-600">Not set</span>
        )}
      </div>
      
      {repDate !== 'N/A' && (
        <button 
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-zinc-700/50 bg-zinc-800/40 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700/80 hover:border-zinc-600 transition-all font-semibold uppercase tracking-wider"
        >
          View Details 
          <span className={`transition-transform duration-200 flex items-center justify-center ${isOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>
      )}

      {isOpen && createPortal(
        <div 
          className={`staff-reporting-details-popup-${b.orderId || b.key} fixed z-[110] w-[320px] max-w-[95vw] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden transform origin-${coords.openUpward ? 'bottom' : 'top'} animate-in fade-in zoom-in-95 duration-200`}
          style={{ 
            left: coords.left, 
            ...(coords.openUpward ? { bottom: window.innerHeight - coords.top } : { top: coords.top }) 
          }}
        >
          <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/60 flex items-center justify-between">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Reporting Details</h4>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700/50">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-0 text-sm">
            <table className="w-full text-left">
              <tbody className="divide-y divide-zinc-800/60">
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400 w-1/3">Reporting Date</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-amber-400">{formatDateDDMMYY(repDate)}</td>
                </tr>
                <tr className="hover:bg-zinc-800/30">
                  <td className="py-2.5 px-4 text-zinc-400">Reporting Time</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-amber-400">{repTime !== 'N/A' ? formatTime12Hour(repTime) : 'Not set'}</td>
                </tr>
                {b.coordinator && (
                  <tr className="hover:bg-zinc-800/30">
                    <td className="py-2.5 px-4 text-zinc-400">Assigned Coordinator</td>
                    <td className="py-2.5 px-4 font-medium text-white">{b.coordinator}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}"""

content = replace_component(content, "StaffEventDetailsCell", new_event_cell)
content = replace_component(content, "StaffReportingDetailsCell", new_reporting_cell)

with open('src/components/StaffModule.tsx', 'w') as f:
    f.write(content)
print("Updated components")
