import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MessageSquare, Mail, MapPin, Calendar, Clock, Package, ShieldCheck, Video, Camera, Award, FileText, CheckCircle2 } from 'lucide-react';
import { useRole } from '../RoleContext';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  booking?: any;
  isStaffView?: boolean;
}

export const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  booking,
  isStaffView
}) => {
  const { 
    currentRole,
    orders, 
    leads, 
    operations, 
    payments, 
    staffAssignments, 
    equipment, 
    leadPackages, 
    packages 
  } = useRole();

  if (!isOpen || (!orderId && !booking)) return null;

  const isStaff = isStaffView || currentRole === 'Staff';

  const rawTarget = orderId || booking?.orderId || booking?.order_id || booking?.leadId || '';
  const targetOrderId = typeof rawTarget === 'string' ? rawTarget.split('_')[0] : rawTarget;

  // Resolve Order & Lead data
  const order = orders?.find(o => o.order_id === targetOrderId || o.lead_id === targetOrderId);
  const lead = leads?.find(l => l.lead_id === order?.lead_id || l.lead_id === targetOrderId || l.customer_id === order?.customer_id);
  const operation = operations?.find(op => op.order_id === targetOrderId || op.order_id === order?.order_id);
  const payment = payments?.find(p => p.order_id === targetOrderId || p.order_id === order?.order_id);
  const leadPackage = leadPackages?.find(lp => lp.lead_id === lead?.lead_id);

  // Parse events list if available
  const events = lead?.events && lead.events.length > 0 ? lead.events : [];
  const primaryEvent = events[0];

  // Customer Details
  const customerName = order?.customer_name || lead?.customer_name || booking?.customerName || 'N/A';
  const mobileNumber = order?.mobile || lead?.mobile || booking?.customerMobile || 'N/A';
  const whatsappNumber = lead?.whatsapp_number || booking?.customerWhatsapp || order?.whatsapp_number || mobileNumber || 'N/A';
  const alternateMobile = lead?.alt_mobile || lead?.alternate_mobile || (lead as any)?.alt_phone || order?.alternate_mobile || booking?.customerAltMobile || 'N/A';
  const address = lead?.address || lead?.client_residence_address || order?.address || (lead?.city ? `${lead.city}${lead.state ? `, ${lead.state}` : ''}` : null) || booking?.customerAddress || 'N/A';
  const googleMapsLocation = lead?.google_maps_link || primaryEvent?.google_maps_link || booking?.googleMapsLink || null;

  // Event Details
  const finalOrderId = order?.order_id || booking?.orderId || targetOrderId || 'N/A';
  const eventName = events.length > 0 
    ? events.map(e => e.event_name || e.event_type).filter(Boolean).join(', ')
    : (lead?.event_name || lead?.event_type || order?.event_type || booking?.eventName || 'N/A');
  const eventType = lead?.event_type || lead?.shoot_type || order?.event_type || booking?.shootType || 'N/A';
  const eventDate = primaryEvent?.event_date || lead?.event_date || order?.event_date || booking?.eventDate || 'N/A';
  const eventStartTime = primaryEvent?.event_start_time || lead?.event_time || order?.event_time || booking?.eventStartTime || 'N/A';
  
  const eventEndDate = primaryEvent?.event_end_date || primaryEvent?.Event_End_Date || lead?.event_end_date || lead?.Event_End_Date || booking?.eventEndDate || 'N/A';
  const eventEndTime = primaryEvent?.event_end_time || booking?.eventEndTime || 'N/A';

  const venueAddress = primaryEvent?.event_location || lead?.event_location || order?.event_location || booking?.venue || 'N/A';
  const guestPax = primaryEvent?.guest_pax || (lead as any)?.guest_pax || order?.guest_pax || booking?.guestPax || 'N/A';

  // Reporting Details
  const reportingDate = primaryEvent?.reporting_date || lead?.Reporting_date || lead?.reporting_date || booking?.reportingDate || eventDate || 'N/A';
  const reportingTime = primaryEvent?.reporting_time || lead?.reporting_time || operation?.reporting_time || booking?.reportingTime || 'N/A';
  const reportingEndDate = primaryEvent?.reporting_end_date || (lead as any)?.reporting_end_date || booking?.reportingEndDate || eventEndDate || 'N/A';
  const reportingLocation = (primaryEvent as any)?.reporting_location || (lead as any)?.reporting_location || booking?.reportingLocation || venueAddress || 'N/A';

  // Order & Financial details (Only for Manager/Admin view)
  const currentStage = order?.current_stage || lead?.status || booking?.currentStage || 'Operations';
  const currentStatus = lead?.current_status || order?.order_status || operation?.event_status || booking?.taskStatus || 'Confirm Order';

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-mono tracking-tight">
                  Event Details: <span className="text-indigo-400">{finalOrderId}</span>
                </h3>
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                {isStaff ? 'Assigned Operations Event Details' : 'Comprehensive CRM & Operations Dossier'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-zinc-300">
          
          {/* Section 1: Customer Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
              <User className="w-4 h-4 text-indigo-400" /> Customer Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Customer Name</span>
                <span className="text-xs font-bold text-white">{customerName}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Mobile Number</span>
                <span className="text-xs font-semibold text-zinc-200">{mobileNumber}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">WhatsApp Number</span>
                <span className="text-xs font-semibold text-zinc-200">{whatsappNumber}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Alternate Mobile</span>
                <span className="text-xs font-semibold text-zinc-200">{alternateMobile}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Event Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Calendar className="w-4 h-4 text-amber-400" /> Event Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Order ID</span>
                <span className="text-xs font-bold font-mono text-indigo-300">{finalOrderId}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event Name</span>
                <span className="text-xs font-bold text-white">{eventName}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event Type</span>
                <span className="text-xs font-semibold text-zinc-200">{eventType}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event Date</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">{eventDate}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event Start Time</span>
                <span className="text-xs font-semibold font-mono text-emerald-400">{eventStartTime}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event End Date</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">{eventEndDate}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event End Time</span>
                <span className="text-xs font-semibold font-mono text-rose-400">{eventEndTime}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Guest Pax</span>
                <span className="text-xs font-semibold text-zinc-200">{guestPax}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60 lg:col-span-3">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Event Location</span>
                <span className="text-xs font-semibold text-zinc-200 break-words">{venueAddress}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60 lg:col-span-3">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Google Maps Link</span>
                {googleMapsLocation && googleMapsLocation !== 'N/A' ? (
                  <a 
                    href={googleMapsLocation.startsWith('http') ? googleMapsLocation : `https://${googleMapsLocation}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-indigo-400 hover:underline font-mono break-all inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5 inline shrink-0" /> {googleMapsLocation}
                  </a>
                ) : (
                  <span className="text-xs text-zinc-500 italic">Not available</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Reporting Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Clock className="w-4 h-4 text-sky-400" /> Reporting Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Reporting Date</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">{reportingDate}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Reporting Time</span>
                <span className="text-xs font-semibold font-mono text-sky-300">{reportingTime}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Reporting End Date</span>
                <span className="text-xs font-semibold font-mono text-zinc-200">{reportingEndDate}</span>
              </div>
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60">
                <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-1">Reporting Location</span>
                <span className="text-xs font-semibold text-zinc-200 break-words">{reportingLocation}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
