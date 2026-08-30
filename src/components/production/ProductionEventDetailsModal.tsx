import React from 'react';
import { Calendar, Clock, MapPin, Tag, X, Sparkles } from 'lucide-react';
import { formatDateDDMMYY, formatTime12Hour } from '../../utils';

export interface ProductionEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: any;
}

export const ProductionEventDetailsModal: React.FC<ProductionEventDetailsModalProps> = ({
  isOpen,
  onClose,
  lead
}) => {
  if (!isOpen || !lead) return null;

  // Extract events array for this lead or order matching existing relationship logic
  let eventsList: Array<{
    event_name: string;
    event_date: string;
    event_start_time?: string;
    event_end_date?: string;
    event_end_time?: string;
    shoot_type?: string;
    venue?: string;
  }> = [];

  if (lead?.events && Array.isArray(lead.events) && lead.events.length > 0) {
    eventsList = lead.events.map((ev: any, idx: number) => ({
      event_name: ev.event_name || ev.event_type || ev.Event_Name || `Event ${idx + 1}`,
      event_date: ev.event_date || ev.Event_Date || '—',
      event_start_time: ev.event_start_time || ev.event_time || ev.Event_Start_Time || '',
      event_end_date: ev.event_end_date || ev.Event_End_Date || '',
      event_end_time: ev.event_end_time || '',
      shoot_type: ev.event_shoot_type || ev.shoot_type || lead?.shoot_type || '',
      venue: ev.event_venue || ev.venue || lead?.venue || ''
    }));
  } else if (lead?.event_name || lead?.Event_Name || lead?.event_date || lead?.Event_Date || lead?.event_type) {
    eventsList = [{
      event_name: lead.event_name || lead.Event_Name || lead.event_type || 'Event 1',
      event_date: lead.event_date || lead.Event_Date || '—',
      event_start_time: lead.event_start_time || lead.event_time || lead.Event_Start_Time || '',
      event_end_date: lead?.event_end_date || lead?.Event_End_Date || '',
      event_end_time: lead?.event_end_time || '',
      shoot_type: lead?.shoot_type || lead?.event_shoot_type || '',
      venue: lead?.venue || lead?.event_venue || ''
    }];
  } else {
    eventsList = [{
      event_name: 'Event 1',
      event_date: '—',
      event_start_time: '',
      shoot_type: lead?.shoot_type || '',
      venue: lead?.venue || ''
    }];
  }

  const customerName = (lead?.customer_name || lead?.name || lead?.client_name || 'Client').trim();
  const orderId = (lead?.order_id || lead?.lead_id || lead?.tracking_id || '').trim();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-sans">
        {/* Accent Bar */}
        <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 w-full" />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight truncate">
                  Event Details
                </h3>
                {orderId && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold">
                    {orderId}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate mt-0.5 font-sans">
                Customer: <strong className="text-zinc-200">{customerName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable Event Cards */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Scheduled Events ({eventsList.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {eventsList.map((ev, idx) => {
              const formattedDate = formatDateDDMMYY(ev.event_date);
              const formattedTime = formatTime12Hour(ev.event_start_time) || 'Not Specified';

              return (
                <div
                  key={idx}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 space-y-3 transition-all"
                >
                  {/* Event Name */}
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-800/70 pb-2.5">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-wider text-sky-400 uppercase block">
                        Event #{idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">
                        {ev.event_name}
                      </h4>
                    </div>

                    {ev.shoot_type && (
                      <span className="px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-medium flex items-center gap-1 shrink-0">
                        <Tag className="w-3 h-3 text-indigo-400" />
                        <span>{ev.shoot_type}</span>
                      </span>
                    )}
                  </div>

                  {/* Grid for Date, Time, Venue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5 text-xs font-sans">
                    {/* Event Date */}
                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850/80 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-450 uppercase font-mono font-bold block">
                          Event Date
                        </span>
                        <span className="text-xs font-semibold text-zinc-100 font-mono">
                          {formattedDate}
                        </span>
                      </div>
                    </div>

                    {/* Event Time */}
                    <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850/80 flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-450 uppercase font-mono font-bold block">
                          Event Time
                        </span>
                        <span className="text-xs font-semibold text-zinc-100 font-mono">
                          {formattedTime}
                        </span>
                      </div>
                    </div>

                    {/* Venue (if available) */}
                    {ev.venue && (
                      <div className="sm:col-span-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850/80 flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-zinc-450 uppercase font-mono font-bold block">
                            Location / Venue
                          </span>
                          <span className="text-xs font-semibold text-zinc-200 truncate block">
                            {ev.venue}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-zinc-900/60 border-t border-zinc-850 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
