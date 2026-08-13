import React, { useState, useRef, useEffect } from 'react';
import { convertTo12Hour } from '../utils';

interface UnifiedEventDropdownCellProps {
  lead: any;
}

export const UnifiedEventDropdownCell: React.FC<UnifiedEventDropdownCellProps> = ({ lead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Extract events array for this lead
  let eventsList: Array<{
    event_name: string;
    event_date: string;
    event_start_time?: string;
    event_end_date?: string;
    event_end_time?: string;
  }> = [];

  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    eventsList = lead.events.map((ev: any, idx: number) => ({
      event_name: ev.event_name || ev.event_type || `Event ${idx + 1}`,
      event_date: ev.event_date || '—',
      event_start_time: ev.event_start_time || ev.event_time || '',
      event_end_date: ev.event_end_date || ev.Event_End_Date || '',
      event_end_time: ev.event_end_time || '',
    }));
  } else if (lead?.event_name || lead?.event_date || lead?.event_type) {
    eventsList = [{
      event_name: lead.event_name || lead.event_type || 'Event 1',
      event_date: lead.event_date || '—',
      event_start_time: lead.event_start_time || lead.event_time || '',
      event_end_date: lead.event_end_date || lead.Event_End_Date || '',
      event_end_time: lead.event_end_time || '',
    }];
  }

  if (eventsList.length === 0) {
    return <span className="text-zinc-600 italic font-mono text-xs">—</span>;
  }

  const isSingle = eventsList.length === 1;
  const buttonText = isSingle
    ? (eventsList[0].event_name || 'Event 1')
    : `Select Event`;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-2.5 py-1.5 flex items-center justify-between gap-1.5 text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/60 rounded-lg transition-all cursor-pointer border border-indigo-500/30 font-mono shadow-sm hover:border-indigo-400/50 min-w-[110px] max-w-[150px] truncate"
        title={buttonText}
      >
        <span className="truncate">{buttonText}</span>
        <span className="text-[10px] text-indigo-400 shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3 z-[150] max-h-80 overflow-y-auto space-y-2.5 max-w-[calc(100vw-32px)]"
          onClick={(e) => e.stopPropagation()}
        >
          {eventsList.map((ev, idx) => {
            const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : 'N/A';
            const endTimeStr = ev.event_end_time ? convertTo12Hour(ev.event_end_time) : 'N/A';
            const endDateStr = ev.event_end_date ? ev.event_end_date : 'N/A';
            
            return (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-850 space-y-1.5 text-left font-mono"
              >
                <div className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-800 pb-1 mb-1">
                  {!isSingle && <span className="text-indigo-400">→</span>}
                  <span className="text-indigo-300">{ev.event_name || `Event ${idx + 1}`}</span>
                </div>
                
                <div className="flex flex-col gap-1 text-[11px] text-zinc-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 font-bold uppercase shrink-0">Start:</span>
                    <span>{ev.event_date || 'N/A'} {startTimeStr !== 'N/A' && `| ${startTimeStr}`}</span>
                  </div>
                  
                  {(ev.event_end_date || ev.event_end_time) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 font-bold uppercase shrink-0 w-[42px]">End:</span>
                      <span>{endDateStr !== 'N/A' ? endDateStr : ev.event_date || 'N/A'} {endTimeStr !== 'N/A' && `| ${endTimeStr}`}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
