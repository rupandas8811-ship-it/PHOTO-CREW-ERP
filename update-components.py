import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

target1_start = "const StaffEventDetailsCell = ({ b }: { b: any }) => {"
target1_end = "};"

target2_start = "const StaffReportingDetailsCell = ({ b }: { b: any }) => {"
target2_end = "};"

# We will use regex to find and replace the entire components.
import re

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
      const popupWidth = 260;
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - popupWidth / 2),
        window.innerWidth - popupWidth - 12
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow;
      
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
          className={`staff-event-details-popup-${b.orderId || b.key} fixed z-[110] w-[260px] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden transform origin-${coords.openUpward ? 'bottom' : 'top'} animate-in fade-in zoom-in-95 duration-200`}
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
          <div className="p-4 space-y-4 text-xs">
            <div>
              <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Event Name</span>
              <div className="font-semibold text-white text-sm">{b.eventName}</div>
              {b.shootType && b.shootType !== 'N/A' && (
                <div className="text-[10px] font-mono uppercase text-zinc-400 mt-1 inline-flex bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">{b.shootType}</div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800/60">
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Event Start</span>
                <div className="font-mono font-semibold text-amber-400 flex flex-col gap-0.5">
                  <span>{formatDateDDMMYY(b.eventDate)}</span>
                  {b.eventStartTime && b.eventStartTime !== 'N/A' && (
                    <span className="text-zinc-400 text-[10px] flex items-center gap-1 mt-0.5">
                      <span className="text-zinc-600">•</span>
                      {formatTime12Hour(b.eventStartTime)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Event End</span>
                <div className="font-mono font-semibold text-zinc-300 flex flex-col gap-0.5">
                  <span>{formatDateDDMMYY(endDate)}</span>
                  {hasEndTime ? (
                    <span className="text-zinc-500 text-[10px] flex items-center gap-1 mt-0.5">
                      <span className="text-zinc-600">•</span>
                      {formatTime12Hour(b.eventEndTime)}
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px] mt-0.5">Not set</span>
                  )}
                </div>
              </div>
            </div>

            {(b.venue && b.venue !== 'N/A') && (
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">Venue & Location</span>
                <div className="text-zinc-300 leading-relaxed bg-zinc-800/30 p-2.5 rounded-lg border border-zinc-800/50">{b.venue}</div>
                {b.googleMapsLink && b.googleMapsLink !== 'N/A' && (
                  <a href={b.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 font-semibold">
                    <MapPin className="w-3 h-3" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            )}
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
      const popupWidth = 240;
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
          className={`staff-reporting-details-popup-${b.orderId || b.key} fixed z-[110] w-[240px] bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden transform origin-${coords.openUpward ? 'bottom' : 'top'} animate-in fade-in zoom-in-95 duration-200`}
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
          <div className="p-4 space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/60 space-y-3">
              <div>
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Reporting Date</span>
                <div className="font-mono font-bold text-amber-400 text-sm">{formatDateDDMMYY(repDate)}</div>
              </div>
              <div className="pt-2 border-t border-zinc-800/60">
                <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Reporting Time</span>
                <div className="font-mono font-bold text-amber-400 text-sm">{repTime !== 'N/A' ? formatTime12Hour(repTime) : 'N/A'}</div>
              </div>
            </div>
            
            {b.coordinator && (
              <div className="pt-1">
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">Assigned Coordinator</span>
                <div className="font-medium text-white bg-zinc-800/30 p-2 rounded-md border border-zinc-800/50">{b.coordinator}</div>
              </div>
            )}
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
