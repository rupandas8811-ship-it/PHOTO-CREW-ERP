import React, { useState, useRef, useEffect } from 'react';
import { convertTo12Hour } from '../utils';

interface UnifiedEventDropdownCellProps {
  lead: any;
}

export const UnifiedEventDropdownCell: React.FC<UnifiedEventDropdownCellProps> = ({ lead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

  // Extract events array for this lead or order
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
  } else {
    eventsList = [{
      event_name: 'Event 1',
      event_date: '—',
      event_start_time: '',
    }];
  }

  const isSingle = eventsList.length === 1;

  // Active event to display on button
  const activeIndex = selectedIndex !== null ? selectedIndex : 0;
  const activeEvent = eventsList[activeIndex] || eventsList[0];

  // Button title formatting
  let buttonTitle = activeEvent.event_name || 'Event 1';
  if (!isSingle && selectedIndex === null) {
    buttonTitle = 'Select Event';
  }

  const formattedStartTime = activeEvent.event_start_time ? convertTo12Hour(activeEvent.event_start_time) : '';

  return (
    <div className="relative inline-block text-left w-full max-w-[220px]" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full text-left px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 rounded-xl transition-all font-sans cursor-pointer group shadow-sm flex flex-col gap-0.5 min-w-[130px]"
        title={buttonTitle}
      >
        <div className="flex items-center justify-between w-full gap-1">
          <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 truncate flex items-center gap-1">
            <span className="text-[10px] text-indigo-400 shrink-0">{isOpen ? '▲' : '▾'}</span>
            <span className="truncate">{buttonTitle}</span>
          </span>
        </div>

        <div className="text-[10.5px] font-mono text-zinc-400 truncate flex items-center gap-1 pl-3.5">
          <span>{activeEvent.event_date || '—'}</span>
          {formattedStartTime && <span className="text-zinc-500">• {formattedStartTime}</span>}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1.5 w-64 sm:w-72 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2.5 z-[150] max-h-80 overflow-y-auto space-y-2 select-none max-w-[calc(100vw-32px)]"
          onClick={(e) => e.stopPropagation()}
        >
          {eventsList.map((ev, idx) => {
            const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '';
            const isSelected = selectedIndex === idx || (isSingle && idx === 0);

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  setIsOpen(false);
                }}
                className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500/60 text-white'
                    : 'bg-zinc-900/80 border-zinc-850 hover:bg-zinc-850 text-zinc-300'
                }`}
              >
                <div className="text-xs font-bold text-indigo-300 flex items-center justify-between pb-1 border-b border-zinc-800/80 mb-1.5">
                  <span className="truncate">{ev.event_name || `Event ${idx + 1}`}</span>
                  {!isSingle && isSelected && (
                    <span className="text-[10px] text-indigo-400 font-mono font-normal shrink-0 ml-1">✓ Selected</span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-zinc-300 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500 text-[10px] uppercase">Date:</span>
                    <span>{ev.event_date || '—'}</span>
                  </div>
                  {startTimeStr && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500 text-[10px] uppercase">Time:</span>
                      <span>• {startTimeStr}</span>
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
