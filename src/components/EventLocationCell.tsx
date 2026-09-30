import React, { useState } from 'react';
import { Lead } from '../types';
import { getEventCategoryDateTimeTimestamp } from './EventCategoryCell';
import { deserializeLeadEvents } from '../utils';

export interface EventLocationCellProps {
  lead: Lead;
  orders?: any[];
  filterEventDateOption?: string;
}

export const EventLocationCell: React.FC<EventLocationCellProps> = ({ lead, orders, filterEventDateOption }) => {
  const [showFull, setShowFull] = useState(false);

  const linkedOrder = orders?.find((o: any) => 
    o.lead_id === lead.lead_id || 
    o.order_id === lead.lead_id || 
    (lead.order_id && (o.order_id === lead.order_id || o.lead_id === lead.order_id)) ||
    ((lead as any).orders && (o.order_id === (lead as any).orders || o.lead_id === (lead as any).orders))
  );

  let rawEventsList: any[] = [];
  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    rawEventsList = lead.events;
  } else if (linkedOrder?.events && Array.isArray(linkedOrder.events) && linkedOrder.events.length > 0) {
    rawEventsList = linkedOrder.events;
  } else if (typeof lead?.events === 'string') {
    try {
      const parsed = JSON.parse(lead.events);
      if (Array.isArray(parsed)) rawEventsList = parsed;
    } catch (e) {}
  }

  if (rawEventsList.length === 0 && lead?.notes_special_customizations) {
    rawEventsList = deserializeLeadEvents(lead.notes_special_customizations).events;
  }
  if (rawEventsList.length === 0 && (linkedOrder as any)?.notes_special_customizations) {
    rawEventsList = deserializeLeadEvents((linkedOrder as any).notes_special_customizations).events;
  }

  let location = '';

  if (rawEventsList.length > 0) {
    const list = rawEventsList.map((ev: any, idx: number) => {
      const loc = (
        ev.event_location ||
        ev.venue_address ||
        ev.venue ||
        ev.address ||
        ev.location ||
        (rawEventsList.length === 1 ? (lead.event_location || linkedOrder?.event_location || '') : '')
      ).trim();

      const dateStr = (ev.event_date || ev.Event_Date || ev.date || lead.event_date || '').trim();
      const timeStr = (ev.event_start_time || ev.event_time || ev.Event_Start_Time || ev.time || lead.event_time || '').trim();
      const timestamp = getEventCategoryDateTimeTimestamp(dateStr, timeStr);

      return {
        id: ev.id || ev.event_id || `evt-${idx}`,
        location: loc,
        timestamp
      };
    });

    // Sort descending by most recent event date + time
    list.sort((a, b) => {
      if (a.timestamp && b.timestamp) return b.timestamp - a.timestamp;
      if (a.timestamp) return -1;
      if (b.timestamp) return 1;
      return 0;
    });

    const targetIndex = (filterEventDateOption === 'last_event' && list.length >= 2) ? 1 : 0;
    const target = list[targetIndex] || list[0];
    location = target?.location || '';
  } else {
    location = (lead.event_location || (lead as any).venue_address || (lead as any).venue || lead.address || linkedOrder?.event_location || '').trim();
  }

  if (!location || location === '—' || location === '-' || location.toLowerCase() === 'n/a') {
    return <span className="text-zinc-600 italic font-mono text-xs">—</span>;
  }

  const isLong = location.length > 10;
  const display = showFull ? location : (isLong ? `${location.slice(0, 10)}...` : location);

  if (!isLong) {
    return (
      <span className="text-zinc-300 font-mono text-xs whitespace-normal break-words">
        {location}
      </span>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setShowFull(!showFull);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowFull(!showFull);
        }
      }}
      className="text-zinc-300 hover:text-amber-400 font-mono text-xs cursor-pointer transition-colors whitespace-normal break-words select-text underline decoration-dotted decoration-zinc-600 hover:decoration-amber-400"
      title={showFull ? 'Click to show shortened' : `Click to view full location: ${location}`}
    >
      {display}
    </span>
  );
};
