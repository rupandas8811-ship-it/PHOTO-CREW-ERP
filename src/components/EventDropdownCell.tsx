import React, { useState, useRef, useEffect } from 'react';
import { convertTo12Hour } from '../utils';

interface EventDropdownCellProps {
  type: 'name' | 'date' | 'time';
  items: string[];
  events?: any[];
}

export const EventDropdownCell: React.FC<EventDropdownCellProps> = ({ type, items, events }) => {
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

  if (!items || items.length === 0) {
    return <span className="text-zinc-600 italic">—</span>;
  }

  // If only one event, display normally
  if (items.length === 1) {
    if (type === 'name') {
      return (
        <div className="text-xs truncate font-sans text-zinc-300" title={items[0]}>
          {items[0]}
        </div>
      );
    } else {
      return <span className="text-zinc-300">{items[0]}</span>;
    }
  }

  let part1 = '';
  if (type === 'name') {
    part1 = 'Multiple Events';
  } else if (type === 'date') {
    part1 = 'Multiple Dates';
  } else {
    part1 = 'Multiple Times';
  }
  const count = `(${items.length})`;

  return (
    <div className="relative inline-block text-left w-[125px] h-[38px]" ref={containerRef}>
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-full min-h-[38px] h-auto py-1 px-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded transition-colors cursor-pointer select-none border border-indigo-500/20 font-mono leading-tight text-center relative z-10"
        >
          <span className="flex-shrink-0 text-[9px] translate-y-[0.5px]">{isOpen ? '▼' : '▶'}</span>
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="whitespace-normal block">{part1}</span>
            <span className="text-[10px] font-bold block mt-1">{count}</span>
          </div>
        </button>
      </div>

      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1.5 w-60 rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl py-2 z-[100] max-h-80 overflow-y-auto select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {type === 'name' && events && events.length > 0 ? (
            events.map((ev, idx) => {
              const name = ev.event_name || '';
              const date = ev.event_date || '—';
              const time = ev.event_start_time ? convertTo12Hour(ev.event_start_time) : '—';
              return (
                <div
                  key={idx}
                  className="px-4 py-2 border-b border-zinc-900/60 last:border-0 hover:bg-zinc-900/50 transition-colors text-left"
                >
                  <div className="font-semibold text-xs text-indigo-300 flex items-start gap-1">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    <span className="break-words">{name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 ml-3 font-mono">
                    Date: {date}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono ml-3">
                    Time: {time}
                  </div>
                </div>
              );
            })
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="px-4 py-2 text-[11px] font-medium text-zinc-300 border-b border-zinc-900/60 last:border-0 hover:bg-zinc-900/50 transition-colors text-left font-mono"
              >
                {item || '—'}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
