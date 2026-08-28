import re

with open('src/components/StaffModule.tsx', 'r') as f:
    content = f.read()

components = """
const StaffEventDetailsCell = ({ b }: { b: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

  const handleToggle = (e: React.MouseEvent) => {
    if (!isOpen) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const popupWidth = 300;
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
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <div className="font-bold text-zinc-100">{b.eventName}</div>
      <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
        <span>{formatDateDDMMYY(b.eventDate)}</span>
        {b.eventStartTime && b.eventStartTime !== 'N/A' && (
          <span className="text-zinc-500">• {formatTime12Hour(b.eventStartTime)}</span>
        )}
      </div>
      {b.shootType && b.shootType !== 'N/A' && (
        <div className="text-[10px] font-mono uppercase text-zinc-500 mt-0.5">
          {b.shootType}
        </div>
      )}
      <button 
        type="button"
        onClick={handleToggle}
        className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-800/30 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        Click to View <span className="text-[8px]">▼</span>
      </button>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
          <div 
            className="fixed z-[110] w-[300px] bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/50 overflow-hidden"
            style={{ 
              left: coords.left, 
              ...(coords.openUpward ? { bottom: window.innerHeight - coords.top } : { top: coords.top }) 
            }}
          >
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/60">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Event Details</h4>
            </div>
            <div className="p-3 space-y-2 text-xs text-zinc-300">
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Customer</span>
                <div className="font-medium text-white">{b.customerName}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Mobile</span>
                  <div>{b.customerMobile}</div>
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">WhatsApp</span>
                  <div>{b.customerWhatsapp}</div>
                </div>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Venue</span>
                <div>{b.venue}</div>
              </div>
              {b.googleMapsLink && b.googleMapsLink !== 'N/A' && (
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Google Maps</span>
                  <a href={b.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline break-all">
                    View Location
                  </a>
                </div>
              )}
              {b.customerAddress && b.customerAddress !== 'N/A' && (
                <div>
                  <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Address</span>
                  <div>{b.customerAddress}</div>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

const StaffReportingDetailsCell = ({ b }: { b: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpward: false });

  const repDate = b.reportingDate || 'N/A';
  const repTime = b.reportingTime || 'N/A';

  const handleToggle = (e: React.MouseEvent) => {
    if (!isOpen) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const popupWidth = 220;
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - popupWidth / 2),
        window.innerWidth - popupWidth - 12
      );
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < 150 && spaceAbove > spaceBelow;
      
      setCoords({
        left,
        top: openUpward ? rect.top - 6 : rect.bottom + 6,
        openUpward
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <div className="text-xs text-zinc-300 font-mono flex items-center gap-1 flex-wrap">
        {repDate !== 'N/A' ? (
          <>
            <span className="font-bold">{formatDateDDMMYY(repDate)}</span>
            {repTime !== 'N/A' && (
              <span className="text-zinc-500 font-normal">• {formatTime12Hour(repTime)}</span>
            )}
          </>
        ) : (
          <span className="text-zinc-600">Not set</span>
        )}
      </div>
      
      {repDate !== 'N/A' && (
        <button 
          type="button"
          onClick={handleToggle}
          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-700/50 bg-zinc-800/30 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Click to View <span className="text-[8px]">▼</span>
        </button>
      )}

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
          <div 
            className="fixed z-[110] w-[220px] bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl shadow-black/50 overflow-hidden"
            style={{ 
              left: coords.left, 
              ...(coords.openUpward ? { bottom: window.innerHeight - coords.top } : { top: coords.top }) 
            }}
          >
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/60">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reporting Details</h4>
            </div>
            <div className="p-3 space-y-3 text-xs text-zinc-300">
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Reporting Date</span>
                <div className="font-mono font-bold text-amber-400">{formatDateDDMMYY(repDate)}</div>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Reporting Time</span>
                <div className="font-mono font-bold text-amber-400">{repTime !== 'N/A' ? formatTime12Hour(repTime) : 'N/A'}</div>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Coordinator</span>
                <div className="font-medium text-white">{b.coordinator || 'Unassigned'}</div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export const StaffModule: React.FC = () => {"""

target = "export const StaffModule: React.FC = () => {"

if target in content:
    content = content.replace(target, components)
    with open('src/components/StaffModule.tsx', 'w') as f:
        f.write(content)
    print("Added components")
else:
    print("Target not found")
