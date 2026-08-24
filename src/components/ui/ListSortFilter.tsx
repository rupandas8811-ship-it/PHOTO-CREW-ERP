import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Filter, Check, ChevronDown, ArrowUpDown } from 'lucide-react';

export type SortOrder = 'latest' | 'oldest';

export interface ListSortFilterProps {
  value: SortOrder;
  onChange: (val: SortOrder) => void;
  label?: string;
  className?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  id?: string;
}

/**
 * Extracts a high-accuracy numerical timestamp from any record across dashboards.
 * Prioritizes event dates, then created timestamps, then ID numerical values.
 */
export function getRecordDateTimestamp(item: any): number {
  if (!item) return 0;

  // 1. EVENT DATE PRIORITIZATION (Strictly prioritize Event Date)
  const eventDateStr = item.event_date || item.eventDate || item.orderObj?.event_date || item.leadObj?.event_date || item.targetFinishDate || item.expected_delivery_date || item.order_date || item.date;
  if (eventDateStr) {
    const t = new Date(eventDateStr).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Direct created_at or created_date
  if (item.created_at) {
    const t = new Date(item.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.created_date) {
    const t = new Date(item.created_date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Nested orderObj or leadObj or prodObj timestamps
  if (item.orderObj?.created_at) {
    const t = new Date(item.orderObj.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.leadObj?.created_at) {
    const t = new Date(item.leadObj.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (item.orderObj?.created_date) {
    const t = new Date(item.orderObj.created_date).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 4. updated_at or modified_at
  if (item.updated_at) {
    const t = new Date(item.updated_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 5. Specific dates like request_date, assignment_date
  if (item.request_date || item.requested_at) {
    const t = new Date(item.request_date || item.requested_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 6. Tiebreaker from numeric sequence in IDs (e.g. ORD-1005, LEA-2003)
  const idStr = String(item.order_id || item.orderId || item.lead_id || item.leadId || item.id || '');
  const digits = idStr.match(/\d+/g);
  if (digits && digits.length > 0) {
    const num = parseInt(digits.join(''), 10);
    if (!isNaN(num)) return num;
  }

  return 0;
}

/**
 * Universal comparator function for sorting any array of records by date
 */
export function compareRecordsByDate(a: any, b: any, order: SortOrder = 'latest'): number {
  const timeA = getRecordDateTimestamp(a);
  const timeB = getRecordDateTimestamp(b);

  if (timeA !== timeB) {
    return order === 'latest' ? timeB - timeA : timeA - timeB;
  }

  // Tiebreaker by ID if timestamps are identical
  const idA = String(a.order_id || a.orderId || a.lead_id || a.id || '');
  const idB = String(b.order_id || b.orderId || b.lead_id || b.id || '');
  return order === 'latest' ? idB.localeCompare(idA) : idA.localeCompare(idB);
}

export const ListSortFilter: React.FC<ListSortFilterProps> = ({
  value,
  onChange,
  label = 'Event Date',
  className = '',
  buttonClassName = '',
  align = 'right',
  id = 'list_sort_filter'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const dropdownWidth = 180;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 120 && spaceAbove > spaceBelow;

    let left = align === 'right' ? rect.right - dropdownWidth : rect.left;
    left = Math.max(12, Math.min(left, viewportWidth - dropdownWidth - 12));

    const top = openUpward ? rect.top - 6 : rect.bottom + 6;

    setCoords({
      top,
      left,
      width: dropdownWidth,
      openUpward
    });
  }, [align]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (newVal: SortOrder) => {
    onChange(newVal);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
          isOpen
            ? 'bg-zinc-800 text-white border-zinc-600 shadow-md ring-1 ring-zinc-500/30'
            : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border-zinc-750 hover:border-zinc-600 shadow-sm'
        } ${buttonClassName}`}
        title={`Sort Records (${value === 'latest' ? 'Latest Event Date on Top' : 'Oldest Event Date on Top'})`}
      >
        <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-mono text-xs">{label}</span>
        <span className="text-[10px] text-zinc-400">▾</span>
      </button>

      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: coords.openUpward ? undefined : `${coords.top}px`,
            bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 999999
          }}
          className="bg-zinc-950/98 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 font-sans"
        >
          <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-850/80 flex items-center justify-between">
            <span>Sort Records</span>
            <ArrowUpDown className="w-3 h-3 text-zinc-400" />
          </div>

          <div className="p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => handleSelect('latest')}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                value === 'latest'
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Latest Event Date on Top</span>
              {value === 'latest' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelect('oldest')}
              className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                value === 'oldest'
                  ? 'bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span>Oldest Event Date on Top</span>
              {value === 'oldest' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
