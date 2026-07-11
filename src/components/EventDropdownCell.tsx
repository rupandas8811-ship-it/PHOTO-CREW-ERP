import React, { useState, useRef, useEffect } from 'react';

interface EventDropdownCellProps {
  type: 'name' | 'date' | 'time';
  items: string[];
}

export const EventDropdownCell: React.FC<EventDropdownCellProps> = ({ type, items }) => {
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

  let label = '';
  if (type === 'name') {
    label = `Multiple Events (${items.length})`;
  } else if (type === 'date') {
    label = `Multiple Dates (${items.length})`;
  } else {
    label = `Multiple Times (${items.length})`;
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded transition-colors cursor-pointer select-none border border-indigo-500/20 font-mono h-7"
      >
        <span className="w-3 text-center inline-block text-[9px]">{isOpen ? '▼' : '▶'}</span>
        <span>{label}</span>
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 mt-1.5 w-52 rounded-lg bg-zinc-950 border border-zinc-800 shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-top-1 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className="px-3 py-1.5 text-[11px] font-medium text-zinc-350 border-b border-zinc-900 last:border-0 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              {item || '—'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
