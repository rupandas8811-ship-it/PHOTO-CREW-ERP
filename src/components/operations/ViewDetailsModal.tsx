import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, MessageSquare, Mail, MapPin, Calendar, Clock, Package, ShieldCheck, Video, Camera, Award, FileText, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRole } from '../RoleContext';
import { deserializeLeadEvents } from '../../utils';
import { SafeProofImage } from '../ui/SafeProofImage';

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
    packages,
    leadEquipmentHistory
  } = useRole();

  const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);
  if (!isOpen || (!orderId && !booking)) return null;

  const isStaff = isStaffView || currentRole === 'Staff';

  const rawTarget = orderId || booking?.orderId || booking?.order_id || booking?.leadId || '';
  const targetOrderId = typeof rawTarget === 'string' ? rawTarget.split('_')[0] : rawTarget;

  // Resolve Order & Lead data
  const order = orders?.find(o => o.order_id === targetOrderId || o.lead_id === targetOrderId);
  const lead = (order?.lead_id ? leads?.find(l => l.lead_id === order.lead_id) : null) || 
               leads?.find(l => l.lead_id === targetOrderId) ||
               (booking?.leadId ? leads?.find(l => l.lead_id === booking.leadId) : null) ||
               (booking?.lead_id ? leads?.find(l => l.lead_id === booking.lead_id) : null);
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

  // Event Details Resolution
  const finalOrderId = order?.order_id || booking?.orderId || targetOrderId || 'N/A';

  const rawEventsFromLead = lead?.events && Array.isArray(lead.events) && lead.events.length > 0 ? lead.events : [];
  const deserializedEvents = (!rawEventsFromLead || rawEventsFromLead.length === 0) && lead?.notes_special_customizations
    ? deserializeLeadEvents(lead.notes_special_customizations).events
    : [];

  const rawEvents = (events && events.length > 0) 
    ? events 
    : (rawEventsFromLead.length > 0 ? rawEventsFromLead : deserializedEvents);

  const allResolvedEvents = rawEvents.length > 0 
    ? rawEvents.map((ev: any, idx: number) => {
        const rawEType = ev.event_type || lead?.event_type || order?.event_type || 'N/A';
        const eType = rawEType === 'Other' 
          ? (ev.custom_event_type || lead?.custom_event_type || 'Other') 
          : rawEType;

        let eName = 'N/A';
        if (ev.event_name === 'Other') {
          eName = ev.custom_event_name || 'Other';
        } else if (ev.custom_event_name && ev.custom_event_name.trim() !== '') {
          eName = ev.custom_event_name;
        } else if (ev.event_name && ev.event_name.trim() !== '') {
          eName = ev.event_name;
        } else if (lead?.custom_event_name && lead.custom_event_name.trim() !== '') {
          eName = lead.custom_event_name;
        } else if (lead?.event_name && lead.event_name !== 'Other' && lead.event_name.trim() !== '') {
          eName = lead.event_name;
        } else if (order?.event_name && order.event_name !== 'Other' && order.event_name.trim() !== '') {
          eName = order.event_name;
        } else if (eType && eType !== 'N/A') {
          eName = eType;
        }

        return {
          id: ev.id || ev.event_id || `ev_${idx}`,
          eventType: eType,
          eventName: eName,
          rawEventType: ev.event_type,
          rawEventName: ev.event_name,
          eventDate: ev.event_date || 'N/A',
          eventStartTime: ev.event_start_time || 'N/A',
          eventEndDate: ev.event_end_date || ev.Event_End_Date || 'N/A',
          eventEndTime: ev.event_end_time || 'N/A',
          eventLocation: ev.event_location || 'N/A',
          googleMapsLink: ev.google_maps_link || null,
          guestPax: ev.guest_pax || 'N/A',
          reportingDate: ev.reporting_date || ev.Reporting_date || ev.event_date || 'N/A',
          reportingTime: ev.reporting_time || 'N/A'
        };
      })
    : [{
        id: 'default_event',
        eventType: lead?.event_type === 'Other' ? (lead?.custom_event_type || 'Other') : (lead?.event_type || order?.event_type || 'N/A'),
        eventName: lead?.custom_event_name || (lead?.event_name && lead.event_name !== 'Other' ? lead.event_name : null) || (order?.event_name && order.event_name !== 'Other' ? order.event_name : null) || (lead?.event_type === 'Other' ? lead?.custom_event_type : lead?.event_type) || order?.event_type || 'N/A',
        eventDate: primaryEvent?.event_date || lead?.event_date || order?.event_date || booking?.eventDate || 'N/A',
        eventStartTime: primaryEvent?.event_start_time || lead?.event_time || order?.event_time || booking?.eventStartTime || 'N/A',
        eventEndDate: primaryEvent?.event_end_date || primaryEvent?.Event_End_Date || lead?.event_end_date || booking?.eventEndDate || 'N/A',
        eventEndTime: primaryEvent?.event_end_time || booking?.eventEndTime || 'N/A',
        eventLocation: primaryEvent?.event_location || lead?.event_location || order?.event_location || booking?.venue || 'N/A',
        googleMapsLink: primaryEvent?.google_maps_link || lead?.google_maps_link || booking?.googleMapsLink || null,
        guestPax: primaryEvent?.guest_pax || (lead as any)?.guest_pax || order?.guest_pax || booking?.guestPax || 'N/A',
        reportingDate: primaryEvent?.reporting_date || lead?.Reporting_date || booking?.reportingDate || 'N/A',
        reportingTime: primaryEvent?.reporting_time || operation?.reporting_time || booking?.reportingTime || 'N/A'
      }];

  const targetEvId = booking?.eventId || booking?.event_id || booking?.assignment?.event_id;
  const targetEvName = booking?.eventName || booking?.event_name || booking?.assignment?.event_name || booking?.shootType;
  const targetEvType = booking?.eventType || booking?.event_type || booking?.assignment?.event_type;

  let targetEvent: any = null;
  if (targetEvId || targetEvName || targetEvType) {
    targetEvent = allResolvedEvents.find((ev: any, idx: number) => {
      if (targetEvId) {
        const searchIdStr = String(targetEvId).trim().toLowerCase();
        if ((ev.id && String(ev.id).trim().toLowerCase() === searchIdStr) ||
            `ev_${idx}` === searchIdStr ||
            String(idx) === searchIdStr) {
          return true;
        }
      }
      if (targetEvName) {
        const searchNameStr = String(targetEvName).trim().toLowerCase();
        if ((ev.eventName && String(ev.eventName).trim().toLowerCase() === searchNameStr) ||
            (ev.rawEventName && String(ev.rawEventName).trim().toLowerCase() === searchNameStr)) {
          return true;
        }
      }
      if (targetEvType) {
        const searchTypeStr = String(targetEvType).trim().toLowerCase();
        if ((ev.eventType && String(ev.eventType).trim().toLowerCase() === searchTypeStr) ||
            (ev.rawEventType && String(ev.rawEventType).trim().toLowerCase() === searchTypeStr)) {
          return true;
        }
      }
      return false;
    });
  }

  const resolvedEvents = targetEvent 
    ? [targetEvent] 
    : (allResolvedEvents.length > 0 ? allResolvedEvents : []);

  const eventName = resolvedEvents.map(e => e.eventName).filter(Boolean).join(', ');
  const eventType = resolvedEvents.map(e => e.eventType).filter(Boolean).join(', ');
  const eventDate = resolvedEvents[0]?.eventDate || 'N/A';
  const eventStartTime = resolvedEvents[0]?.eventStartTime || 'N/A';
  const eventEndDate = resolvedEvents[0]?.eventEndDate || 'N/A';
  const eventEndTime = resolvedEvents[0]?.eventEndTime || 'N/A';
  const venueAddress = resolvedEvents[0]?.eventLocation || 'N/A';
  const guestPax = resolvedEvents[0]?.guestPax || 'N/A';

  // Reporting Details
  const reportingDate = primaryEvent?.reporting_date || lead?.Reporting_date || lead?.reporting_date || booking?.reportingDate || eventDate || 'N/A';
  const reportingTime = primaryEvent?.reporting_time || lead?.reporting_time || operation?.reporting_time || booking?.reportingTime || 'N/A';
  const reportingEndDate = primaryEvent?.reporting_end_date || (lead as any)?.reporting_end_date || booking?.reportingEndDate || eventEndDate || 'N/A';
  const reportingLocation = (primaryEvent as any)?.reporting_location || (lead as any)?.reporting_location || booking?.reportingLocation || venueAddress || 'N/A';

  // Order & Financial details (Only for Manager/Admin view)
  const currentStage = order?.current_stage || lead?.status || booking?.currentStage || 'Operations';
  const currentStatus = lead?.current_status || order?.order_status || operation?.event_status || booking?.taskStatus || 'Confirm Order';

  // Extract Proof Records for this order
  const proofRecords = (leadEquipmentHistory || []).filter(h => {
    if (h.order_id && finalOrderId && h.order_id === finalOrderId) return true;
    if (h.lead_id && lead?.lead_id && h.lead_id === lead.lead_id) return true;
    return false;
  }).map(h => {
    let photoUrl = '';
    let rawFootageLink = '';
    let proofType = h.equipment_status || 'Proof';
    if (h.remarks) {
      try {
        const parsed = JSON.parse(h.remarks);
        photoUrl = parsed.photo_url || photoUrl;
        rawFootageLink = parsed.raw_footage_link || rawFootageLink;
        proofType = parsed.proof_type || proofType;
      } catch (e) {}
    }
    return {
      id: h.id,
      equipmentName: h.equipment_name,
      status: h.equipment_status,
      proofType,
      uploadedBy: h.returned_by || 'Staff',
      uploadedAt: h.returned_at ? new Date(h.returned_at).toLocaleString() : 'N/A',
      photoUrl,
      rawFootageLink
    };
  });

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
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
            <button
              onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" /> Customer Details
              {isCustomerDetailsOpen ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>
            {isCustomerDetailsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in border-t border-zinc-800/50 pt-2 mt-2">
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
            )}
          </div>

          {/* Section 2: Event Details */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" /> Event Details ({resolvedEvents.length} Event{resolvedEvents.length > 1 ? 's' : ''})
              </h4>
              <span className="text-xs font-mono text-indigo-300 font-bold">Order ID: {finalOrderId}</span>
            </div>

            <div className="space-y-4">
              {resolvedEvents.map((ev, idx) => (
                <div key={ev.id || idx} className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-2">
                    <span className="text-xs font-bold font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                      Event Type: {ev.eventType}
                    </span>
                    <span className="text-sm font-black text-white font-mono">
                      Event Name: {ev.eventName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Date</span>
                      <span className="font-bold text-zinc-200 font-mono">{ev.eventDate}</span>
                    </div>
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Start Time</span>
                      <span className="font-bold text-emerald-400 font-mono">{ev.eventStartTime}</span>
                    </div>
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event End Date</span>
                      <span className="font-semibold text-zinc-300 font-mono">{ev.eventEndDate}</span>
                    </div>
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event End Time</span>
                      <span className="font-semibold text-rose-400 font-mono">{ev.eventEndTime}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40 md:col-span-2">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Event Location / Venue</span>
                      <span className="font-semibold text-zinc-200">{ev.eventLocation}</span>
                    </div>
                    <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500 font-mono font-semibold uppercase mb-0.5">Guest Pax</span>
                      <span className="font-semibold text-zinc-200">{ev.guestPax}</span>
                    </div>
                  </div>

                  {ev.googleMapsLink && ev.googleMapsLink !== 'N/A' && (
                    <div className="pt-1">
                      <a 
                        href={ev.googleMapsLink.startsWith('http') ? ev.googleMapsLink : `https://${ev.googleMapsLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:underline font-mono inline-flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Google Maps Link
                      </a>
                    </div>
                  )}
                </div>
              ))}
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

          {/* Section 3.5: Assigned Equipment */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Package className="w-4 h-4 text-amber-400" /> Assigned Equipment
            </h4>
            {booking?.equipmentItems && booking.equipmentItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {booking.equipmentItems.map((item: any, idx: number) => (
                  <div key={idx} className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800/60 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <span className="block text-xs font-bold text-white truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500">Asset ID: {item.assetId}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-zinc-950/40 border border-zinc-800/60 rounded-lg text-xs text-zinc-400 font-mono flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-bold">Not Assigned</span>
                <span>No equipment has been assigned to this staff member for this task/event.</span>
              </div>
            )}
          </div>

          {/* Section 4: Uploaded Verification Proof Images & Handover Docs */}
          {!(currentRole === 'Operations Team' || currentRole === 'Operation Staff') && (
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Camera className="w-4 h-4 text-emerald-400" /> Uploaded Proofs & Handover Docs ({proofRecords.length})
              </h4>
              
              {proofRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {proofRecords.map((rec, idx) => (
                    <div key={rec.id || idx} className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-[11px] font-bold text-white">{rec.equipmentName}</span>
                          <span className="text-[10px] text-zinc-400">By: {rec.uploadedBy} • {rec.uploadedAt}</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                          {rec.status}
                        </span>
                      </div>

                      {rec.photoUrl && (
                        <SafeProofImage url={rec.photoUrl} alt={rec.equipmentName} label="View Full Image" />
                      )}

                      {rec.rawFootageLink && (
                        <div className="p-2 bg-indigo-950/40 border border-indigo-800/50 rounded-lg">
                          <span className="block text-[9px] font-mono text-indigo-300 font-bold uppercase mb-0.5">Raw Footage Link</span>
                          <a 
                            href={rec.rawFootageLink.startsWith('http') ? rec.rawFootageLink : `https://${rec.rawFootageLink}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:underline font-mono break-all inline-flex items-center gap-1"
                          >
                            <Video className="w-3 h-3 shrink-0" /> Open Cloud Folder
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center border border-zinc-800/60 rounded-lg bg-zinc-950/40 text-xs text-zinc-500 italic">
                  No proof images or handover links uploaded for this event yet.
                </div>
              )}
            </div>
          )}

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
