import React, { useState, useRef, useEffect } from 'react';
import { convertTo12Hour } from '../utils';

interface UnifiedEventDropdownCellProps {
  lead: any;
}

export const UnifiedEventDropdownCell: React.FC<UnifiedEventDropdownCellProps> = ({ lead }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [openUpward, setOpenUpward] = useState(false);
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

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Extract events array for this lead or order
  let eventsList: Array<{
    event_name: string;
    event_date: string;
    event_start_time?: string;
    event_end_date?: string;
    event_end_time?: string;
    shoot_type?: string;
  }> = [];

  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    eventsList = lead.events.map((ev: any, idx: number) => ({
      event_name: ev.event_name || ev.event_type || ev.Event_Name || `Event ${idx + 1}`,
      event_date: ev.event_date || ev.Event_Date || '—',
      event_start_time: ev.event_start_time || ev.event_time || ev.Event_Start_Time || '',
      event_end_date: ev.event_end_date || ev.Event_End_Date || '',
      event_end_time: ev.event_end_time || '',
      shoot_type: ev.event_shoot_type || ev.shoot_type || lead?.shoot_type || '',
    }));
  } else if (lead?.event_name || lead?.Event_Name || lead?.event_date || lead?.Event_Date || lead?.event_type) {
    eventsList = [{
      event_name: lead.event_name || lead.Event_Name || lead.event_type || 'Event 1',
      event_date: lead.event_date || lead.Event_Date || '—',
      event_start_time: lead.event_start_time || lead.event_time || lead.Event_Start_Time || '',
      event_end_date: lead?.event_end_date || lead?.Event_End_Date || '',
      event_end_time: lead?.event_end_time || '',
      shoot_type: lead?.shoot_type || lead?.event_shoot_type || '',
    }];
  } else {
    eventsList = [{
      event_name: 'Event 1',
      event_date: '—',
      event_start_time: '',
      shoot_type: lead?.shoot_type || '',
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
          if (isSingle) return;
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`w-full text-left px-2.5 py-1.5 rounded-xl transition-all font-sans group shadow-sm flex flex-col gap-0.5 ${
          isSingle 
            ? 'bg-transparent border-0 p-0 shadow-none cursor-default' 
            : 'bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/50 cursor-pointer'
        }`}
        title={buttonTitle}
      >
        <div className="flex items-center justify-between w-full gap-1">
          <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 truncate flex items-center gap-1.5">
            {!isSingle && (
              <span className="text-[10px] text-indigo-400 shrink-0">{isOpen ? '▲' : '▾'}</span>
            )}
            <span className="truncate">{buttonTitle}</span>
          </span>
        </div>

        <div className="text-[10.5px] font-mono text-zinc-400 truncate flex items-center gap-1">
          <span>{activeEvent.event_date || '—'}</span>
          {formattedStartTime && <span className="text-zinc-500">• {formattedStartTime}</span>}
        </div>

        {activeEvent.shoot_type && (
          <div className="text-[10px] font-mono uppercase text-zinc-500 truncate">
            {activeEvent.shoot_type}
          </div>
        )}
      </button>

      {isOpen && !isSingle && (
        <div
          className={`absolute left-0 z-[150] min-w-full w-[220px] max-w-[calc(100vw-32px)] rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 space-y-1 select-none max-h-60 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {eventsList.map((ev, idx) => {
            const startTimeStr = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '';
            const isSelected = selectedIndex === idx;

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  setIsOpen(false);
                }}
                className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500/60 text-white'
                    : 'bg-zinc-900/70 border-zinc-850 hover:bg-zinc-850 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-indigo-300 truncate">
                    {ev.event_name || `Event ${idx + 1}`}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] text-indigo-400 font-mono shrink-0">✓</span>
                  )}
                </div>
                <div className="text-[10.5px] font-mono text-zinc-400 truncate mt-0.5">
                  <span>{ev.event_date || '—'}</span>
                  {startTimeStr && <span className="text-zinc-500"> • {startTimeStr}</span>}
                </div>
                {ev.shoot_type && (
                  <div className="text-[10px] font-mono uppercase text-zinc-500 truncate mt-0.5">
                    {ev.shoot_type}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

